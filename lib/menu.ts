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
export async function menuView(): Promise<MenuView[]> {
  const { data: restaurants, error } = await db()
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .order("sort_order");
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
      closesAt: closesLabel(restaurant.closes_at),
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

/** Option groups with their options, keyed by item. */
export async function optionGroupsFor(
  itemIds: string[]
): Promise<Map<string, OptionGroupView[]>> {
  const byItem = new Map<string, OptionGroupView[]>();
  if (itemIds.length === 0) return byItem;

  const { data: groups } = await db()
    .from("item_option_groups")
    .select("*")
    .in("menu_item_id", itemIds)
    .order("sort_order");

  const groupRows = (groups ?? []) as OptionGroup[];
  if (groupRows.length === 0) return byItem;

  const { data: options } = await db()
    .from("item_options")
    .select("*")
    .in("group_id", groupRows.map((g) => g.id))
    .order("sort_order");

  for (const group of groupRows) {
    const view: OptionGroupView = {
      id: group.id,
      name: group.name,
      required: group.required,
      maxSelect: group.max_select,
      options: ((options ?? []) as ItemOption[])
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

/** "21:00:00" to "9pm" */
function closesLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}

/** Just the names, for the navigation bar. Never throws during a build. */
export async function openRestaurants(): Promise<{ id: string; name: string }[]> {
  try {
    const { data } = await db()
      .from("restaurants")
      .select("id, name")
      .eq("active", true)
      .order("sort_order");
    return (data ?? []) as { id: string; name: string }[];
  } catch {
    return [];
  }
}
