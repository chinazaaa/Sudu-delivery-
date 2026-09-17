import { db } from "./supabase";
import { BATCH_MINIMUM } from "./config";
import { getBatch } from "./batches";
import { refundsOwed, settleGroupFees } from "./groups";
import { linesFor, type OrderLine } from "./orders";
import type { Batch, Order, Promoter } from "./types";

export type CounterLine = {
  name: string;
  choices: string[];
  qty: number;
  unitPrice: number;
};
export type CounterGroup = {
  restaurant: string;
  lines: CounterLine[];
  expectedFoodTotal: number;
};

export type HandoutOrder = Order & { lines: OrderLine[] };

/**
 * One bag per person. Orders added later in the week merge into the same bag,
 * because the customer experiences it as one order (addendum §3).
 */
export type HandoutBag = {
  key: string;
  name: string;
  hostel: string;
  phone: string;
  orders: HandoutOrder[];
  lines: OrderLine[];
};

export type BatchSheet = {
  batch: Batch;
  /** Paid orders only, because those are the ones that travel. */
  counter: CounterGroup[];
  handout: HandoutBag[];
  unpaid: HandoutOrder[];
  refunds: Order[];
  /** Phone to PIN, for the confirmation message. */
  pins: Record<string, string>;
  summary: {
    paidCount: number;
    unpaidCount: number;
    minimum: number;
    gross: number;
    foodCost: number;
    commission: number;
    net: number;
    /** Fuel, driver and anything else bought on the night. */
    costs: number;
    /** What is actually left: gross, less food, commission and those costs. */
    profit: number;
  };
};

export async function batchSheet(batchId: string): Promise<BatchSheet | null> {
  const batch = await getBatch(batchId);
  if (!batch) return null;

  // Settling is idempotent, and doing it here means a group that shrank is
  // already correct by the time she reads the sheet.
  await settleGroupFees(batch);

  const { data, error } = await db()
    .from("orders")
    .select("*")
    .eq("batch_id", batchId)
    .neq("status", "refunded")
    .order("customer_name", { ascending: true });
  if (error) throw new Error(error.message);

  const orders = (data ?? []) as Order[];
  const lines = await linesFor(orders.map((o) => o.id));
  const linesByOrder = new Map<string, OrderLine[]>();
  for (const line of lines) {
    const list = linesByOrder.get(line.order_id) ?? [];
    list.push(line);
    linesByOrder.set(line.order_id, list);
  }

  const withLines = (o: Order): HandoutOrder => ({
    ...o,
    lines: linesByOrder.get(o.id) ?? [],
  });

  // Unpaid orders do not travel, so they are not on the counter sheet either.
  const paid = orders.filter((o) => o.status !== "pending");
  const unpaid = orders.filter((o) => o.status === "pending");
  const paidIds = new Set(paid.map((o) => o.id));

  const commission = await commissionFor(paid);
  const costs = batch.fuel_cost + batch.driver_cost + batch.other_cost;

  return {
    batch,
    counter: groupForCounter(lines.filter((l) => paidIds.has(l.order_id))),
    handout: bagsFor(paid.map(withLines), await collectingSeparately(batchId)),
    unpaid: unpaid.map(withLines),
    refunds: await refundsOwed(batchId),
    pins: await pinsFor(orders.map((o) => o.customer_phone)),
    summary: {
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      minimum: BATCH_MINIMUM,
      gross: sum(paid, (o) => o.total),
      foodCost: sum(paid, (o) => o.subtotal_food),
      commission,
      net: sum(paid, (o) => o.total - o.subtotal_food) - commission,
      costs,
      profit: sum(paid, (o) => o.total - o.subtotal_food) - commission - costs,
    },
  };
}

/** Groups in this batch where each person collects their own bag. */
async function collectingSeparately(batchId: string): Promise<Set<string>> {
  const { data } = await db()
    .from("order_groups")
    .select("id, collect_mode")
    .eq("batch_id", batchId)
    .eq("collect_mode", "each");
  return new Set((data ?? []).map((row) => row.id as string));
}

async function pinsFor(phones: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(phones)];
  if (unique.length === 0) return {};

  const { data } = await db().from("customers").select("phone, pin").in("phone", unique);
  return Object.fromEntries((data ?? []).map((row) => [row.phone as string, row.pin as string]));
}

/**
 * Orders merged into one bag per person. A group order that was split into a
 * payment link each still bags under the name on each share, so the labels
 * match what was ordered.
 */
function bagsFor(
  orders: HandoutOrder[],
  collectByPerson: Set<string>
): HandoutBag[] {
  const bags = new Map<string, HandoutBag>();

  for (const order of orders) {
    // Whoever is collecting decides how this is bagged. If one person takes
    // everything, it is one name to call; if everyone collects their own, each
    // name is called separately.
    const separate = order.group_id !== null && collectByPerson.has(order.group_id);
    const key =
      separate && order.for_name
        ? `${order.customer_phone}|${order.for_name}`
        : order.customer_phone;

    const bag = bags.get(key) ?? {
      key,
      name: separate && order.for_name ? order.for_name : order.customer_name,
      hostel: order.hostel,
      phone: order.customer_phone,
      orders: [],
      lines: [],
    };
    bag.orders.push(order);
    bag.lines.push(...order.lines);
    bags.set(key, bag);
  }

  return [...bags.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Orders collapsed by restaurant into totals. This is what she reads aloud at
 * the counter, so it is one line per distinct item, not one per order.
 */
export function groupForCounter(lines: OrderLine[]): CounterGroup[] {
  const byRestaurant = new Map<string, Map<string, CounterLine>>();

  for (const line of lines) {
    const items = byRestaurant.get(line.restaurant) ?? new Map<string, CounterLine>();
    const choices = [...line.choices].sort();
    // A large pepperoni and a small margherita are two different things to
    // order, so the choices are part of what makes a counter line.
    const key = `${line.name}|${choices.join("|")}@${line.unit_price_at_order}`;
    const existing = items.get(key);
    if (existing) existing.qty += line.qty;
    else
      items.set(key, {
        name: line.name,
        choices,
        qty: line.qty,
        unitPrice: line.unit_price_at_order,
      });
    byRestaurant.set(line.restaurant, items);
  }

  return [...byRestaurant.entries()].map(([restaurant, items]) => {
    const lines = [...items.values()].sort((a, b) => b.qty - a.qty);
    return {
      restaurant,
      lines,
      expectedFoodTotal: lines.reduce((t, l) => t + l.qty * l.unitPrice, 0),
    };
  });
}

async function commissionFor(orders: Order[]): Promise<number> {
  const codes = [...new Set(orders.map((o) => o.promoter_code).filter(Boolean))] as string[];
  if (codes.length === 0) return 0;

  const { data } = await db().from("promoters").select("code, rate").in("code", codes);
  const rates = new Map((data ?? []).map((p) => [p.code as string, p.rate as number]));
  return orders.reduce(
    (total, o) => total + (o.promoter_code ? rates.get(o.promoter_code) ?? 0 : 0),
    0
  );
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

export type BatchRow = Batch & {
  orderCount: number;
  paidCount: number;
  /** Money in, less food, commission and the run's own costs. */
  profit: number;
  gross: number;
};

/**
 * Batches with live counts and profit. The default window is the last few days
 * and everything ahead, which is what today needs; "all" reaches back through
 * every run ever made, because a past run is still worth reading.
 */
export async function batchOverview(window: "recent" | "all" = "recent"): Promise<BatchRow[]> {
  let query = db().from("batches").select("*");
  if (window === "recent") {
    query = query
      .gte("run_date", new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
      .order("cut_off_at", { ascending: true });
  } else {
    // In date order, not newest first: a list that opens on October while
    // September is still running does not read as a history of anything.
    query = query.order("cut_off_at", { ascending: true }).limit(200);
  }

  const { data: batches, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (batches ?? []) as Batch[];
  const { data: orders } = await db()
    .from("orders")
    .select("batch_id, status, total, subtotal_food, promoter_code")
    .in("batch_id", rows.map((b) => b.id));

  const all = (orders ?? []) as Pick<
    Order,
    "batch_id" | "status" | "total" | "subtotal_food" | "promoter_code"
  >[];
  const commission = await commissionFor(
    all.filter((o) => o.status !== "pending" && o.status !== "refunded") as Order[]
  );
  const paidEverywhere = all.filter(
    (o) => o.status !== "pending" && o.status !== "refunded"
  ).length;
  // Commission is a flat rate per order, so sharing the total out by order
  // count gives each run its own share without a second query per run.
  const perOrderCommission = paidEverywhere === 0 ? 0 : commission / paidEverywhere;

  return rows.map((b) => {
    const mine = all.filter((o) => o.batch_id === b.id && o.status !== "refunded");
    const paid = mine.filter((o) => o.status !== "pending");
    const margin = sum(paid, (o) => o.total - o.subtotal_food);
    const costs = b.fuel_cost + b.driver_cost + b.other_cost;

    return {
      ...b,
      orderCount: mine.length,
      paidCount: paid.length,
      gross: sum(paid, (o) => o.total),
      profit: Math.round(margin - paid.length * perOrderCommission - costs),
    };
  });
}

export type PromoterRow = Promoter & { orders: number; owed: number };

/** Per-promoter order counts, so commission is calculable (brief §13). */
export async function promoterRows(): Promise<PromoterRow[]> {
  const { data: promoters } = await db().from("promoters").select("*").order("code");
  const { data: orders } = await db()
    .from("orders")
    .select("promoter_code")
    .not("promoter_code", "is", null)
    .neq("status", "refunded");

  return ((promoters ?? []) as Promoter[]).map((p) => {
    const count = (orders ?? []).filter((o) => o.promoter_code === p.code).length;
    return { ...p, orders: count, owed: count * p.rate };
  });
}
