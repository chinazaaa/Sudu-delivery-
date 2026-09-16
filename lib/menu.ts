import { db } from "./supabase";
import type { MenuView } from "./view";
import type { MenuItem, Restaurant } from "./types";

/** The customer menu: active restaurants, their items, in display order. */
export async function menuView(): Promise<MenuView[]> {
  const { data: restaurants, error } = await db()
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const rows = (restaurants ?? []) as Restaurant[];
  if (rows.length === 0) return [];

  const { data: items } = await db()
    .from("menu_items")
    .select("*")
    .in("restaurant_id", rows.map((r) => r.id))
    .order("sort_order");

  return rows.map((restaurant) => ({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      closesAt: closesLabel(restaurant.closes_at),
    },
    items: ((items ?? []) as MenuItem[])
      .filter((i) => i.restaurant_id === restaurant.id)
      .map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price_food,
        available: i.available,
      })),
  }));
}

/** "21:00:00" -> "9pm" */
function closesLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")}${suffix}` : `${hour}${suffix}`;
}
