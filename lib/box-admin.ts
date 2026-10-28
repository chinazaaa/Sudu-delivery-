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

  /*
   * Every item, rather than the first thousand of them.
   *
   * The database answers with at most a thousand rows and says nothing
   * about the rest. There are eighteen hundred pickable items, ordered by
   * name, so everything from the back half of the alphabet was missing from
   * this picker: not merely unpickable, but silently absent, so a box
   * holding one of them opened with the select showing its first option
   * instead. Saving that form then wrote Domino's rice over whatever the
   * box actually held, without a word.
   *
   * Ordered by id as well as by name, because rows that tie have no order
   * of their own and pages taken out of a partial order can repeat one row
   * and lose another.
   */
  const items: any[] = [];
  for (let at = 0; ; at += 1000) {
    const { data: page, error } = await db()
      .from("menu_items")
      .select("id, restaurant_id, name, price_food, available")
      .in("restaurant_id", food.map((one: any) => one.id))
      .eq("available", true)
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(at, at + 999);
    if (error) break;
    const batch = (page ?? []) as any[];
    items.push(...batch);
    if (batch.length < 1000) break;
  }

  const ids = items.map((one: any) => one.id as string);
  const groups = await groupsFor(ids);

  return food.map((place: any) => ({
    id: place.id as string,
    name: place.name as string,
    items: items
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

/** One line of a picker: the dish, whose counter it is, and what it costs. */
export type PickerHit = {
  id: string;
  name: string;
  shop: string;
  price: number;
  options: { name: string; delta: number }[];
};

/**
 * The few dishes somebody is typing at, rather than the whole shop.
 *
 * The box builder is handed everything, and that is right for it: one
 * admin, one page, a picker used dozens of times in a sitting. An order
 * page is not that. It was calling foodCatalogue to fill a box nobody had
 * typed into yet, which is two thousand dishes, ten paged round trips for
 * their choices, and the lot of it serialised into a page somebody opened
 * to read a phone number. That is the whole of why opening an order felt
 * like nothing had happened.
 *
 * Searched here rather than in the browser, so the thing that costs is paid
 * for by the person who actually typed something.
 */
export async function catalogueSearch(
  query: string,
  limit = 8
): Promise<PickerHit[]> {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const { data: places } = await db()
    .from("restaurants")
    .select("id, name, kind, active")
    .order("sort_order", { ascending: true });

  const food = (places ?? []).filter(
    (one: any) => one.kind !== "skincare" && one.active !== false
  );
  if (food.length === 0) return [];
  const nameOf = new Map<string, string>(
    food.map((one: any) => [one.id as string, one.name as string])
  );

  /*
   * Narrowed in the database on the longest word, then sieved here.
   *
   * "kfc hot wings" is a counter and a dish, and no single column holds
   * both, so the exact rule lives here as it always has. What the database
   * can do is throw away the ninety-odd per cent that cannot match any of
   * the words, which is the difference between reading two thousand rows
   * and reading forty.
   */
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a));
  const { data: items } = await db()
    .from("menu_items")
    .select("id, restaurant_id, name, price_food")
    .in("restaurant_id", [...nameOf.keys()])
    .eq("available", true)
    .or(`name.ilike.%${longest.replace(/[%,]/g, " ")}%`)
    .order("name", { ascending: true })
    .limit(400);

  const named = (items ?? []).map((one: any) => ({
    id: one.id as string,
    name: String(one.name ?? ""),
    shop: nameOf.get(one.restaurant_id as string) ?? "",
    price: Number(one.price_food ?? 0),
  }));

  // Every word somewhere in the name and the counter together, name
  // matches first, exactly as the picker has always sorted them.
  const hits = named
    .map((one) => ({
      one,
      line: `${one.name.toLowerCase()} ${one.shop.toLowerCase()}`,
      named: words.filter((word) => one.name.toLowerCase().includes(word)).length,
    }))
    .filter((hit) => words.every((word) => hit.line.includes(word)))
    .sort((a, b) => b.named - a.named)
    .slice(0, limit);

  const groups = await groupsFor(hits.map((hit) => hit.one.id));
  return hits.map((hit) => ({
    ...hit.one,
    options: (groups.get(hit.one.id) ?? []).flatMap((group) =>
      group.options.map((option) => ({
        name: `${group.name}: ${option.name}`,
        delta: option.delta,
      }))
    ),
  }));
}

/**
 * The dishes already on an order, as picker lines.
 *
 * All a line needs to offer its real choices. Two queries for the handful
 * of things in front of somebody, rather than ten for everything the shop
 * sells.
 */
export async function catalogueFor(itemIds: string[]): Promise<PickerHit[]> {
  const wanted = [...new Set(itemIds.filter((one) => one && one.trim() !== ""))];
  if (wanted.length === 0) return [];

  const { data: items } = await db()
    .from("menu_items")
    .select("id, restaurant_id, name, price_food")
    .in("id", wanted);
  if (!items || items.length === 0) return [];

  const { data: places } = await db()
    .from("restaurants")
    .select("id, name")
    .in("id", [...new Set((items as any[]).map((one) => one.restaurant_id as string))]);
  const nameOf = new Map<string, string>(
    ((places ?? []) as any[]).map((one) => [one.id as string, one.name as string])
  );

  const groups = await groupsFor((items as any[]).map((one) => one.id as string));
  return (items as any[]).map((one) => ({
    id: one.id as string,
    name: String(one.name ?? ""),
    shop: nameOf.get(one.restaurant_id as string) ?? "",
    price: Number(one.price_food ?? 0),
    options: (groups.get(one.id as string) ?? []).flatMap((group) =>
      group.options.map((option) => ({
        name: `${group.name}: ${option.name}`,
        delta: option.delta,
      }))
    ),
  }));
}
