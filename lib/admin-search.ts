import { db } from "./supabase";
import { orderFeed, customerRows } from "./admin-data";
import { naira } from "./money";
import { dayLabel } from "./time";
import { isGone } from "./orders";

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
 * Deliberately five kinds and no more: orders, people, things on the menu,
 * the kitchens, and who has bought a thing before. A search that returns
 * runs and offers and coupons as well is a search nobody reads to the
 * bottom of.
 */

export type Found = {
  kind: "order" | "person" | "item" | "kitchen" | "buyer";
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
  /** Who has bought this thing, or bought from this kitchen, before. */
  buyers: Found[];
  total: number;
};

const empty = (term: string): Results => ({
  term,
  orders: [],
  people: [],
  items: [],
  kitchens: [],
  buyers: [],
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

  const [orders, people, menu, kitchens, buyers] = await Promise.all([
    orderFeed({ status: "all", search: term, limit: 200 }).catch(() => []),
    customerRows(term).catch(() => []),
    searchMenu(term),
    searchKitchens(term),
    searchBuyers(term),
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
    buyers,
    total: 0,
  };

  found.total =
    found.orders.length +
    found.people.length +
    found.items.length +
    found.kitchens.length +
    found.buyers.length;
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

/**
 * Who has bought this before.
 *
 * The one question the shop asks that nothing could answer. Somebody's
 * sister rings about the Fantasy ice cream and the shop knows the ice
 * cream, knows the run and knows the money, and cannot say who bought it:
 * the only way through was opening last week's orders one at a time until
 * a familiar name turned up.
 *
 * Both halves of the question, because they are asked in the same breath.
 * A dish finds the people who ordered that dish. A kitchen finds the
 * people who order from it, which is the question somebody has when
 * Domino's is doing two for one and there is a person who only ever
 * orders pizza.
 *
 * Newest first, because the person worth ringing is nearly always the one
 * who bought it most recently, and capped like every other kind here: a
 * list of forty names is a list nobody reads to the bottom of.
 */
async function searchBuyers(term: string): Promise<Found[]> {
  try {
    // The kitchens whose name matches, so "Dominos" finds everything they
    // sell rather than nothing: no dish is called Domino's.
    const { data: shops } = await db()
      .from("restaurants")
      .select("id, name")
      .ilike("name", `%${term}%`)
      .limit(5)
      .overrideTypes<{ id: string; name: string }[]>();

    const shopIds = (shops ?? []).map((one) => one.id);

    const [named, theirs] = await Promise.all([
      db()
        .from("menu_items")
        .select("id, name")
        .ilike("name", `%${term}%`)
        .limit(60)
        .overrideTypes<{ id: string; name: string }[]>(),
      shopIds.length > 0
        ? db()
            .from("menu_items")
            .select("id, name")
            .in("restaurant_id", shopIds)
            .limit(400)
            .overrideTypes<{ id: string; name: string }[]>()
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);

    const items = new Map<string, string>();
    for (const row of [...(named.data ?? []), ...(theirs.data ?? [])]) {
      items.set(row.id, row.name);
    }
    if (items.size === 0) return [];

    const { data: lines } = await db()
      .from("order_items")
      .select("menu_item_id, qty, order_id")
      .in("menu_item_id", [...items.keys()])
      .limit(1000)
      .overrideTypes<{ menu_item_id: string; qty: number; order_id: string }[]>();
    if (!lines || lines.length === 0) return [];

    const { data: orders } = await db()
      .from("orders")
      .select("id, customer_name, customer_phone, status, created_at")
      .in("id", [...new Set(lines.map((one) => one.order_id))])
      .limit(1000)
      .overrideTypes<
        {
          id: string;
          customer_name: string;
          customer_phone: string;
          status: string;
          created_at: string;
        }[]
      >();
    const orderById = new Map((orders ?? []).map((one) => [one.id, one]));

    /* One row per person, not per line: somebody who ordered it three
       times is one person to ring, and the thing worth knowing about them
       is when they last did. */
    type Buyer = {
      phone: string;
      name: string;
      qty: number;
      last: string;
      what: Set<string>;
    };
    const buyers = new Map<string, Buyer>();

    for (const line of lines) {
      const order = orderById.get(line.order_id);
      // Cancelled and refunded are not people who bought it.
      if (!order || isGone(order.status)) continue;

      const one =
        buyers.get(order.customer_phone) ??
        {
          phone: order.customer_phone,
          name: order.customer_name,
          qty: 0,
          last: order.created_at,
          what: new Set<string>(),
        };
      one.qty += line.qty;
      if (order.created_at > one.last) one.last = order.created_at;
      const name = items.get(line.menu_item_id);
      if (name) one.what.add(name);
      buyers.set(order.customer_phone, one);
    }

    return [...buyers.values()]
      .sort((a, b) => b.last.localeCompare(a.last))
      .slice(0, 8)
      .map((one) => {
        const what = [...one.what];
        const said =
          what.length === 1
            ? what[0]
            : `${what[0]} and ${what.length - 1} other${what.length === 2 ? "" : "s"}`;
        return {
          kind: "buyer" as const,
          // Their own page, which has their number, their block and the
          // way to message them, which is the next thing anybody does.
          href: `/admin/customers/${encodeURIComponent(one.phone)}`,
          title: one.name || one.phone,
          detail: `${one.qty} × ${said} · last ${dayLabel(one.last)}`,
        };
      });
  } catch {
    return [];
  }
}
