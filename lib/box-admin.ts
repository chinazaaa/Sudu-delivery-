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
