import { db } from "./supabase";
import { BATCH_MINIMUM } from "./config";
import { getBatch } from "./batches";
import { linesFor, type OrderLine } from "./orders";
import type { Batch, Order, Promoter } from "./types";

export type CounterLine = { name: string; qty: number; unitPrice: number };
export type CounterGroup = {
  restaurant: string;
  lines: CounterLine[];
  expectedFoodTotal: number;
};

export type HandoutOrder = Order & { lines: OrderLine[] };

export type BatchSheet = {
  batch: Batch;
  /** Paid orders only — these are the ones that travel. */
  counter: CounterGroup[];
  handout: HandoutOrder[];
  unpaid: HandoutOrder[];
  summary: {
    paidCount: number;
    unpaidCount: number;
    minimum: number;
    gross: number;
    foodCost: number;
    commission: number;
    net: number;
  };
};

export async function batchSheet(batchId: string): Promise<BatchSheet | null> {
  const batch = await getBatch(batchId);
  if (!batch) return null;

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

  return {
    batch,
    counter: groupForCounter(lines.filter((l) => paidIds.has(l.order_id))),
    handout: paid.map(withLines),
    unpaid: unpaid.map(withLines),
    summary: {
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      minimum: BATCH_MINIMUM,
      gross: sum(paid, (o) => o.total),
      foodCost: sum(paid, (o) => o.subtotal_food),
      commission,
      net: sum(paid, (o) => o.total - o.subtotal_food) - commission,
    },
  };
}

/**
 * Orders collapsed by restaurant into totals — this is what she reads aloud at
 * the counter, so it is one line per distinct item, not one per order.
 */
export function groupForCounter(lines: OrderLine[]): CounterGroup[] {
  const byRestaurant = new Map<string, Map<string, CounterLine>>();

  for (const line of lines) {
    const items = byRestaurant.get(line.restaurant) ?? new Map<string, CounterLine>();
    const key = `${line.name}@${line.unit_price_at_order}`;
    const existing = items.get(key);
    if (existing) existing.qty += line.qty;
    else items.set(key, { name: line.name, qty: line.qty, unitPrice: line.unit_price_at_order });
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

export type BatchRow = Batch & { orderCount: number; paidCount: number };

/** Every batch from today onward, with live counts, so a weak one shows early. */
export async function batchOverview(): Promise<BatchRow[]> {
  const { data: batches, error } = await db()
    .from("batches")
    .select("*")
    .gte("run_date", new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10))
    .order("cut_off_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (batches ?? []) as Batch[];
  const { data: orders } = await db()
    .from("orders")
    .select("batch_id, status")
    .in("batch_id", rows.map((b) => b.id));

  return rows.map((b) => {
    const mine = (orders ?? []).filter(
      (o) => o.batch_id === b.id && o.status !== "refunded"
    );
    return {
      ...b,
      orderCount: mine.length,
      paidCount: mine.filter((o) => o.status !== "pending").length,
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
