import { db } from "./supabase";
import { orderFeed, customerRows } from "./admin-data";
import { naira } from "./money";

/**
 * One box that finds anything in the shop.
 *
 * Every board draws a search field in the header of every admin page, and
 * there was nothing behind it, so each page grew its own box that searched
 * only that page. Somebody holding a phone number does not know whether it
 * is a customer question or an order question, and somebody reading a
 * transfer narration has a number and nothing else. The answer has to be
 * the same whichever page they happened to be standing on.
 *
 * Deliberately four kinds and no more: orders, people, things on the menu,
 * and the kitchens. A search that returns runs and offers and coupons as
 * well is a search nobody reads to the bottom of.
 */

export type Found = {
  kind: "order" | "person" | "item" | "kitchen";
  href: string;
  title: string;
  /** The line under it, which is what tells two Audreys apart. */
  detail: string;
  /** Money, where the thing has a price. Already written out. */
  figure?: string;
};

export type Results = {
  term: string;
  orders: Found[];
  people: Found[];
  items: Found[];
  kitchens: Found[];
  total: number;
};

const empty = (term: string): Results => ({
  term,
  orders: [],
  people: [],
  items: [],
  kitchens: [],
  total: 0,
});

/**
 * Everything matching, in the four kinds, capped so one busy kind cannot
 * bury the others.
 */
export async function lookFor(asked: string): Promise<Results> {
  const term = asked.trim();
  // One letter matches most of the shop, which is not an answer.
  if (term.length < 2) return empty(term);

  const [orders, people, menu, kitchens] = await Promise.all([
    orderFeed({ status: "all", search: term, limit: 200 }).catch(() => []),
    customerRows(term).catch(() => []),
    searchMenu(term),
    searchKitchens(term),
  ]);

  const found: Results = {
    term,
    orders: orders.slice(0, 8).map((order) => ({
      kind: "order" as const,
      href: `/admin/orders/${order.id}`,
      title: `${order.customer_name} · ${order.hostel || "no block"}`,
      detail: `${order.batchLabel} · ${order.status}`,
      figure: naira(order.total),
    })),
    people: people.slice(0, 8).map((row) => ({
      kind: "person" as const,
      href: `/admin/customers/${encodeURIComponent(row.phone)}`,
      title: row.name || row.phone,
      detail: `${row.phone} · ${row.hostel || "no block"} · ${row.orders} order${
        row.orders === 1 ? "" : "s"
      }`,
      figure: naira(row.spend),
    })),
    items: menu,
    kitchens,
    total: 0,
  };

  found.total =
    found.orders.length + found.people.length + found.items.length + found.kitchens.length;
  return found;
}

/** Things on the menu, with the kitchen they belong to. */
async function searchMenu(term: string): Promise<Found[]> {
  try {
    const { data } = await db()
      .from("menu_items")
      .select("id, name, price, restaurant_id, available")
      .ilike("name", `%${term}%`)
      .limit(8)
      .overrideTypes<
        { id: string; name: string; price: number; restaurant_id: string; available: boolean }[]
      >();
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const { data: shops } = await db()
      .from("restaurants")
      .select("id, name")
      .in("id", [...new Set(rows.map((one) => one.restaurant_id))])
      .overrideTypes<{ id: string; name: string }[]>();
    const named = new Map((shops ?? []).map((one) => [one.id, one.name]));

    return rows.map((row) => ({
      kind: "item" as const,
      // The kitchen's own page, because that is where a price or a
      // photo gets changed. There is no page for one dish on its own.
      href: `/admin/menu/${row.restaurant_id}`,
      title: row.name,
      detail: `${named.get(row.restaurant_id) ?? "Unknown kitchen"}${
        row.available ? "" : " · off the menu"
      }`,
      figure: naira(row.price),
    }));
  } catch {
    return [];
  }
}

async function searchKitchens(term: string): Promise<Found[]> {
  try {
    const { data } = await db()
      .from("restaurants")
      .select("id, name, active, kind")
      .ilike("name", `%${term}%`)
      .limit(6)
      .overrideTypes<{ id: string; name: string; active: boolean; kind?: string }[]>();

    return (data ?? []).map((row) => ({
      kind: "kitchen" as const,
      href: `/admin/menu/${row.id}`,
      title: row.name,
      detail: row.active ? "On the site" : "Hidden",
    }));
  } catch {
    return [];
  }
}
