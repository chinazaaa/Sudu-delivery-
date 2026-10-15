import { db } from "./supabase";

/**
 * The menu as a box builder needs it: every restaurant, every dish it still
 * sells, and the choices a dish makes you make.
 *
 * Sent to the browser whole. A picker that asked the server on every keypress
 * would be three round trips to add one pizza, and this is one admin on one
 * page, not a shop front.
 *
 * Food only. The skincare shelf is two thousand products and no box will
 * ever contain a serum.
 */
export type PickerOption = { id: string; name: string; delta: number };
export type PickerGroup = {
  id: string;
  name: string;
  required: boolean;
  options: PickerOption[];
};
export type PickerItem = {
  id: string;
  name: string;
  price: number;
  groups: PickerGroup[];
};
export type PickerRestaurant = { id: string; name: string; items: PickerItem[] };

export async function foodCatalogue(): Promise<PickerRestaurant[]> {
  const { data: places } = await db()
    .from("restaurants")
    .select("id, name, kind, active")
    .order("sort_order", { ascending: true });

  const food = (places ?? []).filter(
    (one: any) => one.kind !== "skincare" && one.active !== false
  );
  if (food.length === 0) return [];

  const { data: items } = await db()
    .from("menu_items")
    .select("id, restaurant_id, name, price_food, available")
    .in("restaurant_id", food.map((one: any) => one.id))
    .eq("available", true)
    .order("name", { ascending: true });

  const ids = (items ?? []).map((one: any) => one.id as string);
  const groups = await groupsFor(ids);

  return food.map((place: any) => ({
    id: place.id as string,
    name: place.name as string,
    items: (items ?? [])
      .filter((one: any) => one.restaurant_id === place.id)
      .map((one: any) => ({
        id: one.id as string,
        name: one.name as string,
        price: Number(one.price_food ?? 0),
        groups: groups.get(one.id as string) ?? [],
      })),
  }));
}

async function groupsFor(itemIds: string[]): Promise<Map<string, PickerGroup[]>> {
  const out = new Map<string, PickerGroup[]>();
  if (itemIds.length === 0) return out;

  // In pages, because "in" a list of seven hundred ids is a URL no database
  // will take.
  const size = 200;
  for (let at = 0; at < itemIds.length; at += size) {
    const slice = itemIds.slice(at, at + size);
    const { data: rows } = await db()
      .from("item_option_groups")
      .select("id, menu_item_id, name, required, sort_order")
      .in("menu_item_id", slice)
      .order("sort_order", { ascending: true });
    if (!rows || rows.length === 0) continue;

    const { data: options } = await db()
      .from("item_options")
      .select("id, group_id, name, price_delta, available, sort_order")
      .in("group_id", rows.map((one: any) => one.id))
      .eq("available", true)
      .order("sort_order", { ascending: true });

    for (const row of rows) {
      const group: PickerGroup = {
        id: row.id as string,
        name: row.name as string,
        required: row.required === true,
        options: (options ?? [])
          .filter((one: any) => one.group_id === row.id)
          .map((one: any) => ({
            id: one.id as string,
            name: one.name as string,
            delta: Number(one.price_delta ?? 0),
          })),
      };
      const item = row.menu_item_id as string;
      out.set(item, [...(out.get(item) ?? []), group]);
    }
  }
  return out;
}

/** Every occasion, live or not, for the admin list. */
export async function allOccasions() {
  const { data } = await db()
    .from("occasions")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function allBoxes() {
  const { data } = await db()
    .from("boxes")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

/** What a box comes to, and whether anything in it has gone off the menu. */
export type BoxPrice = {
  /** The food, off today's menu. */
  food: number;
  /** What somebody pays, delivery in it, on a shared run and in a car. */
  onARun: number;
  inACar: number;
  /** Lines pointing at something sold out or deleted. A box with any of
   *  these cannot be priced for a customer and quietly disappears from the
   *  shelf, so admin has to be told rather than left to wonder. */
  gone: string[];
};

/**
 * What every box costs, for the page that edits them.
 *
 * The editor showed the delivery figure and nothing else, so the one number
 * anybody actually wants, which is what the customer pays, was not on the screen,
 * and the food it is made of was not either. Working it out meant reading
 * the database by hand, which is not a thing admin should ever require.
 *
 * Priced here rather than off the picker, because the picker only carries
 * what is on sale: a box holding something sold out would price as though
 * that line were free, which is worse than not pricing it at all.
 */
export async function boxPrices(
  boxes: { id: string; lines: unknown; run_fee: number; car_fee: number }[]
): Promise<Map<string, BoxPrice>> {
  const found = new Map<string, BoxPrice>();
  if (boxes.length === 0) return found;

  const read = (raw: unknown): { menu_item_id: string; qty: number; option_ids: string[] }[] =>
    Array.isArray(raw) ? (raw as any[]) : [];

  const itemIds = [
    ...new Set(boxes.flatMap((box) => read(box.lines).map((line) => line.menu_item_id))),
  ].filter(Boolean);
  const optionIds = [
    ...new Set(boxes.flatMap((box) => read(box.lines).flatMap((line) => line.option_ids ?? []))),
  ].filter(Boolean);

  const [items, options] = await Promise.all([
    itemIds.length > 0
      ? db().from("menu_items").select("id, name, price_food, available").in("id", itemIds)
      : Promise.resolve({ data: [] as any[] }),
    optionIds.length > 0
      ? db().from("item_options").select("id, price_delta").in("id", optionIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const price = new Map((items.data ?? []).map((row: any) => [row.id as string, Number(row.price_food ?? 0)]));
  const named = new Map((items.data ?? []).map((row: any) => [row.id as string, String(row.name ?? "")]));
  const off = new Set(
    (items.data ?? []).filter((row: any) => row.available === false).map((row: any) => row.id as string)
  );
  const delta = new Map((options.data ?? []).map((row: any) => [row.id as string, Number(row.price_delta ?? 0)]));

  for (const box of boxes) {
    let food = 0;
    const gone: string[] = [];

    for (const line of read(box.lines)) {
      const qty = Number(line.qty ?? 0);
      const unit = price.get(line.menu_item_id);
      if (unit === undefined) {
        gone.push("something since deleted");
        continue;
      }
      if (off.has(line.menu_item_id)) {
        gone.push(named.get(line.menu_item_id) || "something sold out");
      }
      const extras = (line.option_ids ?? []).reduce(
        (sum: number, id: string) => sum + (delta.get(id) ?? 0),
        0
      );
      food += qty * (unit + extras);
    }

    found.set(box.id, {
      food,
      onARun: food + Number(box.run_fee ?? 0),
      inACar: food + Number(box.car_fee ?? 0),
      gone,
    });
  }

  return found;
}
