import { unstable_cache } from "next/cache";
import { db } from "./supabase";
import type { ItemView, MenuView, OptionGroupView } from "./view";
import type {
  ItemOption,
  MenuCategory,
  MenuItem,
  OptionGroup,
  Restaurant,
} from "./types";

/** The customer menu: active restaurants, their categories, items and choices. */
async function readMenu(): Promise<MenuView[]> {
  const { data: restaurants, error } = await db()
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);

  const places = (restaurants ?? []) as Restaurant[];
  if (places.length === 0) return [];

  const ids = places.map((r) => r.id);
  const [categories, items] = await Promise.all([
    db().from("menu_categories").select("*").in("restaurant_id", ids).order("sort_order"),
    db().from("menu_items").select("*").in("restaurant_id", ids).order("sort_order"),
  ]);

  const menuItems = (items.data ?? []) as MenuItem[];
  const groupsByItem = await optionGroupsFor(menuItems.map((i) => i.id));

  return places.map((restaurant) => ({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      logoUrl: restaurant.logo_url ?? "",
      bannerUrl: restaurant.banner_url ?? "",
      brandHex: restaurant.brand_hex ?? "",
    },
    categories: ((categories.data ?? []) as MenuCategory[])
      .filter((c) => c.restaurant_id === restaurant.id)
      .map((c) => ({ id: c.id, name: c.name })),
    items: menuItems
      .filter((i) => i.restaurant_id === restaurant.id)
      .map(
        (i): ItemView => ({
          id: i.id,
          name: i.name,
          price: i.price_food,
          available: i.available,
          imageUrl: i.image_url ?? "",
          description: i.description ?? "",
          categoryId: i.category_id ?? null,
          groups: groupsByItem.get(i.id) ?? [],
        })
      ),
  }));
}

/**
 * Ids in mouthfuls a query string can hold. A hundred uuids is about four
 * kilobytes, which every layer between here and the database accepts, and it
 * also keeps each answer well under the thousand rows one request returns.
 */
function inBatches(ids: string[], size = 100): string[][] {
  const batches: string[][] = [];
  for (let at = 0; at < ids.length; at += size) batches.push(ids.slice(at, at + size));
  return batches;
}

/** Option groups with their options, keyed by item. */
export async function optionGroupsFor(
  itemIds: string[]
): Promise<Map<string, OptionGroupView[]>> {
  const byItem = new Map<string, OptionGroupView[]>();
  if (itemIds.length === 0) return byItem;

  // One `in()` holding every id on the shop is tens of kilobytes of query
  // string, and the database refuses it. Asking for a whole menu then quietly
  // returned no options at all, so a combo that must ask which drink came
  // through as a plain item at the wrong price. Ask in batches, and let a
  // real failure be a failure rather than an empty answer.
  const groupRows: OptionGroup[] = [];
  for (const batch of inBatches(itemIds)) {
    const { data, error } = await db()
      .from("item_option_groups")
      .select("*")
      .in("menu_item_id", batch)
      .order("sort_order");
    if (error) throw new Error(error.message);
    groupRows.push(...((data ?? []) as OptionGroup[]));
  }
  if (groupRows.length === 0) return byItem;

  const optionRows: ItemOption[] = [];
  for (const batch of inBatches(groupRows.map((g) => g.id))) {
    const { data, error } = await db()
      .from("item_options")
      .select("*")
      .in("group_id", batch)
      .order("sort_order");
    if (error) throw new Error(error.message);
    optionRows.push(...((data ?? []) as ItemOption[]));
  }

  for (const group of groupRows) {
    const view: OptionGroupView = {
      id: group.id,
      name: group.name,
      required: group.required,
      maxSelect: group.max_select,
      options: optionRows
        .filter((o) => o.group_id === group.id)
        .map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: o.price_delta,
          available: o.available,
        })),
    };
    byItem.set(group.menu_item_id, [...(byItem.get(group.menu_item_id) ?? []), view]);
  }
  return byItem;
}

/**
 * One restaurant's menu. The restaurant page used to load every restaurant,
 * every item and every option in the system to show one of them, which is why
 * it felt slow to open.
 */
async function readMenuFor(restaurantId: string): Promise<MenuView | null> {
  const { data } = await db()
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .eq("active", true)
    .maybeSingle();
  const restaurant = data as Restaurant | null;
  if (!restaurant) return null;

  const [categories, items] = await Promise.all([
    db().from("menu_categories").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
    db().from("menu_items").select("*").eq("restaurant_id", restaurantId).order("sort_order"),
  ]);

  const menuItems = (items.data ?? []) as MenuItem[];
  const groupsByItem = await optionGroupsFor(menuItems.map((i) => i.id));

  return {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      logoUrl: restaurant.logo_url ?? "",
      bannerUrl: restaurant.banner_url ?? "",
      brandHex: restaurant.brand_hex ?? "",
    },
    categories: ((categories.data ?? []) as MenuCategory[]).map((c) => ({
      id: c.id,
      name: c.name,
    })),
    items: menuItems.map(
      (i): ItemView => ({
        id: i.id,
        name: i.name,
        price: i.price_food,
        available: i.available,
        imageUrl: i.image_url ?? "",
        description: i.description ?? "",
        categoryId: i.category_id ?? null,
        groups: groupsByItem.get(i.id) ?? [],
      })
    ),
  };
}

/** Just the names, for the navigation bar. Never throws during a build. */
export async function openRestaurants(): Promise<{ id: string; name: string }[]> {
  try {
    const { data } = await db()
      .from("restaurants")
      .select("id, name")
      .eq("active", true)
      .order("sort_order")
      .order("name");
    return (data ?? []) as { id: string; name: string }[];
  } catch {
    return [];
  }
}


/**
 * The menu, read once a minute rather than once a visitor.
 *
 * Nine restaurants and getting on for eight hundred items is a lot to fetch
 * and a lot to send, and it is the same for everybody. Admin clears this the
 * moment anything changes, so the minute only ever covers a stretch where
 * nothing has.
 */
export const menuView = unstable_cache(readMenu, ["menu-view"], {
  revalidate: 60,
  tags: ["menu"],
});

export const menuViewFor = unstable_cache(readMenuFor, ["menu-view-for"], {
  revalidate: 60,
  tags: ["menu"],
});
