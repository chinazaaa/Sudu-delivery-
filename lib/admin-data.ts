import { db } from "./supabase";
import { linesFor, type OrderLine } from "./orders";
import { SLOT_LABEL } from "./config";
import { shareRef } from "./money";
import { runDateLabel, weekdayLabel } from "./time";
import type { Batch, Order } from "./types";
import type { BatchStage } from "./stages";

export type FeedOrder = Order & {
  lines: OrderLine[];
  /** The other orders in this one's group, for numbering it 1005a, 1005b. */
  groupOrders: { id: string; order_no: number | null }[];
  /** Where that order's run has got to, which its customer is watching. */
  batchStage: BatchStage;
  /** Containers and delivery on that person's other orders in the same run. */
  otherItems: number;
  otherFee: number;
  batchLabel: string;
  runDate: string;
  deliveryWindow: string;
  slot: Batch["slot"];
  pin: string | null;
  /** In a shared delivery that has not closed, so it has no fee yet and
   *  marking it paid would take the food money alone. */
  awaitingGroup: boolean;
};

export type OrderFilter = {
  status?: Order["status"] | "all";
  batchId?: string | null;
  /** "card" narrows to the people waiting on a card link. */
  paymentMethod?: "transfer" | "card" | null;
  search?: string;
  limit?: number;
};

/**
 * Every order, newest first, whatever run it belongs to. Orders used to be
 * readable only inside a run, which hid anything from last week.
 */
export async function orderFeed(filter: OrderFilter = {}): Promise<FeedOrder[]> {
  let query = db()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 200);

  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);
  if (filter.batchId) query = query.eq("batch_id", filter.batchId);
  if (filter.paymentMethod) query = query.eq("payment_method", filter.paymentMethod);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let orders = (data ?? []) as Order[];

  // Read before the search below, which needs it: a group's order numbers are
  // how "1042b" written in a transfer narration finds its order. Declared
  // after it, the search threw before it could run, and every admin page that
  // searches went down with it.
  const groups = await groupMap(orders.map((o) => o.group_id));
  const stillOpen = await openGroups(orders.map((o) => o.group_id));

  const term = filter.search?.trim().toLowerCase();
  if (term) {
    orders = orders.filter(
      (order) =>
        order.customer_name.toLowerCase().includes(term) ||
        order.customer_phone.includes(term) ||
        // A transfer's narration is the order number, sometimes with a letter
        // on it for one part of a group, so both forms have to find it.
        matchesRef(order, groups.get(order.group_id ?? "") ?? [], term) ||
        (order.for_name ?? "").toLowerCase().includes(term) ||
        order.hostel.toLowerCase().includes(term)
    );
  }

  const lines = await linesFor(orders.map((o) => o.id));
  const batches = await batchMap(orders.map((o) => o.batch_id));
  const pins = await pinMap(orders.map((o) => o.customer_phone));

 return orders.map((order) => {
    const batch = batches.get(order.batch_id);
    // Adding to an order already in a run charges only the difference, so the
    // rest of that person's load in this run has to be visible beside it.
    const siblings = orders.filter(
      (other) =>
        other.id !== order.id &&
        other.batch_id === order.batch_id &&
        other.customer_phone === order.customer_phone &&
        other.status !== "refunded"
    );

    return {
      ...order,
      groupOrders: order.group_id ? groups.get(order.group_id) ?? [] : [],
      otherItems: siblings.reduce(
        (count, other) =>
          count +
          lines
            .filter((line) => line.order_id === other.id)
            .reduce((sum, line) => sum + line.qty, 0),
        0
      ),
      otherFee: siblings.reduce((sum, other) => sum + other.fee, 0),
      lines: lines.filter((line) => line.order_id === order.id),
      batchLabel: batch
        ? `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot]}`
        : "Unknown run",
      batchStage: batch?.stage ?? "ordering",
      runDate: batch?.run_date ?? "",
      deliveryWindow: batch?.delivery_window_text ?? "",
      slot: batch?.slot ?? "afternoon",
      pin: pins.get(order.customer_phone) ?? null,
      awaitingGroup: order.group_id ? stillOpen.has(order.group_id) : false,
    };
  });
}

/** Shared deliveries among these groups that have not closed yet. */
async function openGroups(ids: (string | null)[]): Promise<Set<string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Set();

  // Tolerant of a database that has not had the migration run yet. This runs
  // on the orders feed, and a missing column must never be able to take that
  // page down: no shared deliveries is the right answer in that case anyway.
  const { data, error } = await db()
    .from("order_groups")
    .select("id")
    .in("id", unique)
    .not("closes_at", "is", null)
    .is("closed_at", null);

  if (error) return new Set();
  return new Set((data ?? []).map((row) => row.id as string));
}

/** Every order in each group, so a share can be numbered within its group. */
async function groupMap(
  ids: (string | null)[]
): Promise<Map<string, { id: string; order_no: number | null }[]>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const { data } = await db()
    .from("orders")
    .select("id, order_no, group_id")
    .in("group_id", unique)
    .order("order_no");

  const map = new Map<string, { id: string; order_no: number | null }[]>();
  for (const row of data ?? []) {
    const key = row.group_id as string;
    map.set(key, [
      ...(map.get(key) ?? []),
      { id: row.id as string, order_no: (row.order_no as number | null) ?? null },
    ]);
  }
  return map;
}

async function batchMap(ids: string[]): Promise<Map<string, Batch>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await db().from("batches").select("*").in("id", unique);
  return new Map(((data ?? []) as Batch[]).map((batch) => [batch.id, batch]));
}

async function pinMap(phones: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(phones)];
  if (unique.length === 0) return new Map();
  const { data } = await db().from("customers").select("phone, pin").in("phone", unique);
  return new Map((data ?? []).map((row) => [row.phone as string, row.pin as string]));
}

/** "1005", "#1005b" or "1005b" all find the order they were typed for. */
function matchesRef(
  order: Order,
  group: { id: string; order_no: number | null }[],
  term: string
): boolean {
  const wanted = term.replace(/[#\s]/g, "").toLowerCase();
  if (!wanted) return false;

  const own = String(order.order_no ?? "");
  if (own && own.includes(wanted)) return true;

  const ref = shareRef(order, group).replace("#", "").toLowerCase();
  // A bare group number finds every part of that group.
  return ref === wanted || ref.startsWith(wanted);
}

export type CustomerRow = {
  phone: string;
  name: string;
  hostel: string;
  pin: string;
  orders: number;
  spend: number;
  lastOrder: string | null;
  /** What the admin wants remembered about this person. */
  note: string;
  /** How they paid last time, which is how they will want to pay next time.
   *  Worth knowing before a run: a card person needs a link sent by hand. */
  pays: "transfer" | "card";
};

/** The customer book: who they are, what they have spent, and their PIN. */
export async function customerRows(search?: string): Promise<CustomerRow[]> {
  // Named columns, and a retry without the newest one, so a database that has
  // not had the migration run on it still shows the customer book.
  const full = await db()
    .from("customers")
    .select("phone, name, hostel, pin, admin_note, payment_method")
    .order("name");

  const { data, error } = full.error
    ? await db().from("customers").select("phone, name, hostel, pin, admin_note").order("name")
    : full;
  if (error) throw new Error(error.message);

  const { data: orders } = await db()
    .from("orders")
    .select("customer_phone, total, status, created_at");

  const rows = (data ?? []).map((row) => {
    const mine = (orders ?? []).filter(
      (order) => order.customer_phone === row.phone && order.status !== "refunded"
    );
    const paid = mine.filter((order) => order.status !== "pending");
    return {
      phone: row.phone as string,
      name: row.name as string,
      hostel: (row.hostel as string) ?? "",
      pin: (row.pin as string) ?? "",
      note: (row.admin_note as string) ?? "",
      pays: ((row as { payment_method?: string }).payment_method === "card"
        ? "card"
        : "transfer") as "transfer" | "card",
      orders: mine.length,
      spend: paid.reduce((total, order) => total + (order.total as number), 0),
      lastOrder:
        mine.map((order) => order.created_at as string).sort().at(-1) ?? null,
    };
  });

  const term = search?.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(term) ||
      row.phone.includes(term) ||
      row.hostel.toLowerCase().includes(term)
  );
}

export type Dashboard = {
  paidOrders: number;
  unpaidOrders: number;
  gross: number;
  /** Delivery money kept, after any discount codes came off it. */
  fees: number;
  /** What the codes gave away, so the figure above can say so. */
  discounts: number;
  customers: number;
  newCustomers: number;
  averageOrder: number;
  topItems: { name: string; restaurant: string; qty: number }[];
  byWeekday: { label: string; orders: number; gross: number }[];
};

/** The numbers worth looking at over the last four weeks. */
export async function dashboard(days = 28): Promise<Dashboard> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await db()
    .from("orders")
    .select("id, total, fee, discount, status, created_at, customer_phone, batch_id")
    .gte("created_at", since);
  if (error) throw new Error(error.message);

  const orders = (data ?? []).filter((order) => order.status !== "refunded");
  const paid = orders.filter((order) => order.status !== "pending");

  const lines = await linesFor(paid.map((order) => order.id as string));
  const counts = new Map<string, { name: string; restaurant: string; qty: number }>();
  for (const line of lines) {
    const key = `${line.name}|${line.restaurant}`;
    const seen = counts.get(key);
    if (seen) seen.qty += line.qty;
    else counts.set(key, { name: line.name, restaurant: line.restaurant, qty: line.qty });
  }

  const batches = await batchMap(paid.map((order) => order.batch_id as string));
  const weekdays = new Map<string, { label: string; orders: number; gross: number }>();
  for (const order of paid) {
    const batch = batches.get(order.batch_id as string);
    if (!batch) continue;
    const label = `${weekdayLabel(batch.run_date)} ${SLOT_LABEL[batch.slot]}`;
    const seen = weekdays.get(label) ?? { label, orders: 0, gross: 0 };
    seen.orders += 1;
    seen.gross += order.total as number;
    weekdays.set(label, seen);
  }

  const { count: customers } = await db()
    .from("customers")
    .select("phone", { count: "exact", head: true });
  const { count: newCustomers } = await db()
    .from("customers")
    .select("phone", { count: "exact", head: true })
    .gte("created_at", since);

  const gross = paid.reduce((total, order) => total + (order.total as number), 0);

  return {
    paidOrders: paid.length,
    unpaidOrders: orders.length - paid.length,
    gross,
    // A code comes out of the delivery, so a run where somebody used one kept
    // less than it charged. Counting the fee alone called money margin that
    // was never collected.
    fees: paid.reduce(
      (total, order) => total + (order.fee as number) - ((order.discount as number) ?? 0),
      0
    ),
    discounts: paid.reduce((total, order) => total + ((order.discount as number) ?? 0), 0),
    customers: customers ?? 0,
    newCustomers: newCustomers ?? 0,
    averageOrder: paid.length === 0 ? 0 : Math.round(gross / paid.length),
    topItems: [...counts.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    byWeekday: [...weekdays.values()].sort((a, b) => b.gross - a.gross),
  };
}
