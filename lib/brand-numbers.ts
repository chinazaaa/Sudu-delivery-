import { db } from "./supabase";
import { NOT_ORDERS_SQL } from "./orders";

/**
 * How one kitchen is doing, in the numbers a kitchen would ask for.
 *
 * Written for a conversation rather than for a dashboard. Walking into a
 * brand and saying "students want you here" is an opinion; saying "we spent
 * four hundred thousand naira with your Sangotedo branch last term across
 * ninety orders, and this is what they bought" is a fact they can take to
 * whoever signs things.
 *
 * Everything counted off what was actually bought and paid for. Refunded
 * and cancelled orders are left out, because neither is money the kitchen
 * ever saw, and quoting them to the kitchen is a number they can disprove.
 */
export type BrandNumbers = {
  /** What we spent at the counter, which is their takings from us. */
  spend: number;
  orders: number;
  items: number;
  customers: number;
  /** The first and most recent order, so a pitch can say "since". */
  firstAt: string | null;
  lastAt: string | null;
  best: { name: string; qty: number; spend: number }[];
  /** Spend by month, oldest first, for showing it is not a one-off. */
  byMonth: { month: string; spend: number; orders: number }[];
};

export const EMPTY_BRAND: BrandNumbers = {
  spend: 0,
  orders: 0,
  items: 0,
  customers: 0,
  firstAt: null,
  lastAt: null,
  best: [],
  byMonth: [],
};

/**
 * Every kitchen that has ever sold anything, for the picker.
 *
 * Off the menu rather than off the orders, so a kitchen that has just been
 * added is in the list with nothing in it rather than missing entirely:
 * "nobody has ordered from them yet" is itself worth seeing.
 */
export async function brandsForPicker(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await db()
    .from("restaurants")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) return [];
  return ((data ?? []) as { id: string; name: string }[]).map((one) => ({
    id: one.id,
    name: one.name,
  }));
}

/**
 * The numbers for one kitchen, over a window of days.
 *
 * Days of zero means everything, which is what somebody about to meet a
 * brand actually wants: the whole relationship, not the last fortnight of
 * it.
 */
export async function brandNumbers(
  restaurantId: string,
  days = 0
): Promise<BrandNumbers> {
  if (restaurantId === "") return EMPTY_BRAND;

  // The kitchen's own items first. Without these there is nothing to join
  // order lines against, and asking for the lines of every kitchen and
  // filtering here would read the whole order book to answer about one.
  const { data: itemRows, error: itemError } = await db()
    .from("menu_items")
    .select("id, name")
    .eq("restaurant_id", restaurantId);
  if (itemError) return EMPTY_BRAND;

  const named = new Map(
    ((itemRows ?? []) as { id: string; name: string }[]).map((one) => [one.id, one.name])
  );
  const itemIds = [...named.keys()];
  if (itemIds.length === 0) return EMPTY_BRAND;

  let lines = db()
    .from("order_items")
    .select(
      "id, menu_item_id, qty, unit_price_at_order, orders!inner(id, status, created_at, customer_phone)"
    )
    .in("menu_item_id", itemIds)
    // Refunded and cancelled are not takings, and a brand can disprove them.
    .not("orders.status", "in", NOT_ORDERS_SQL)
    // Pending is somebody who has not paid, so it is not money either.
    .neq("orders.status", "pending");

  if (days > 0) {
    const from = new Date(Date.now() - days * 86400 * 1000).toISOString();
    lines = lines.gt("orders.created_at", from);
  }

  const { data, error } = await lines;
  if (error) return EMPTY_BRAND;

  type Row = {
    id: string;
    menu_item_id: string;
    qty: number | null;
    unit_price_at_order: number | null;
    orders: { id: string; created_at: string; customer_phone: string | null } | null;
  };

  const rows = (data ?? []) as unknown as Row[];

  /*
   * What was chosen on each line.
   *
   * A plate is its dish and the things ticked on it, and this read the
   * dish alone. The Place sells prawn rice at 3,900 and honey BBQ chicken
   * at 2,750 as a choice on top, so one plate at 6,650 came back as
   * "Prawn rice" and a number nearly twice the price of prawn rice. The
   * kitchen reading its own page would not recognise the line.
   *
   * Named the way the counter sheet names a line, because it is the same
   * thing being named and somebody should not have to learn it twice.
   */
  const chosen = new Map<string, string[]>();
  if (rows.length > 0) {
    const { data: picks } = await db()
      .from("order_item_options")
      .select("order_item_id, name_at_order")
      .in("order_item_id", rows.map((row) => row.id));
    for (const pick of (picks ?? []) as {
      order_item_id: string;
      name_at_order: string;
    }[]) {
      const was = chosen.get(pick.order_item_id) ?? [];
      was.push(pick.name_at_order);
      chosen.set(pick.order_item_id, was);
    }
  }

  const plateOf = (row: Row): { key: string; name: string } => {
    const picks = [...(chosen.get(row.id) ?? [])].sort();
    const dish = named.get(row.menu_item_id) ?? "Something since removed";
    return picks.length === 0
      ? { key: row.menu_item_id, name: dish }
      : {
          key: `${row.menu_item_id}|${picks.join("|")}`,
          name: `${dish} · ${picks.join(", ")}`,
        };
  };

  const orderIds = new Set<string>();
  const phones = new Set<string>();
  const perItem = new Map<string, { name: string; qty: number; spend: number }>();
  const perMonth = new Map<string, { spend: number; orders: Set<string> }>();

  let spend = 0;
  let items = 0;
  let firstAt: string | null = null;
  let lastAt: string | null = null;

  for (const row of rows) {
    const order = row.orders;
    if (!order) continue;

    const qty = Number(row.qty ?? 0);
    // What we handed over the counter, not what the customer paid us: the
    // delivery fee is ours and is none of the kitchen's business.
    const money = qty * Number(row.unit_price_at_order ?? 0);

    spend += money;
    items += qty;
    orderIds.add(order.id);
    if (order.customer_phone) phones.add(order.customer_phone);

    // One row per plate as it was actually ordered, so prawn rice with
    // chicken on it and prawn rice without are two lines rather than one
    // line at a price neither of them is.
    const plate = plateOf(row);
    const was = perItem.get(plate.key) ?? { name: plate.name, qty: 0, spend: 0 };
    perItem.set(plate.key, {
      name: plate.name,
      qty: was.qty + qty,
      spend: was.spend + money,
    });

    const month = String(order.created_at).slice(0, 7);
    const month_was = perMonth.get(month) ?? { spend: 0, orders: new Set<string>() };
    month_was.spend += money;
    month_was.orders.add(order.id);
    perMonth.set(month, month_was);

    if (firstAt === null || order.created_at < firstAt) firstAt = order.created_at;
    if (lastAt === null || order.created_at > lastAt) lastAt = order.created_at;
  }

  const best = [...perItem.values()]
    // By how many went out rather than by money. A kitchen reads its own
    // menu by what sells, and the dearest thing selling twice is not the
    // thing they want to hear about.
    .sort((a, b) => b.qty - a.qty || b.spend - a.spend)
    .slice(0, 12);

  const byMonth = [...perMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, one]) => ({ month, spend: one.spend, orders: one.orders.size }));

  return {
    spend,
    orders: orderIds.size,
    items,
    customers: phones.size,
    firstAt,
    lastAt,
    best,
    byMonth,
  };
}
