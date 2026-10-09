import { db } from "./supabase";
import { activeBands } from "./settings";
import { feeFor } from "./fees";
import { containersIn } from "./containers";
import { carLabel } from "./view";
import { isGone, isPaid, linesFor, type OrderLine } from "./orders";
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
  /** Which shop this order's trip belongs to: a run, a skincare drop, a car
   *  of its own or a parcel. */
  batchKind: string;
  runDate: string;
  deliveryWindow: string;
  slot: Batch["slot"];
  pin: string | null;
  /** What to greet them as, where the shop has said. Empty means the first
   *  word of their name. */
  callsThem: string;
  /** In a shared delivery that has not closed, so it has no fee yet and
   *  marking it paid would take the food money alone. */
  awaitingGroup: boolean;
  /** Who brought this customer, so commission on a run has a name against
   *  it rather than only a number. Null when nobody did. */
  promoter: { code: string; name: string } | null;
  /** The app or the website. Empty on orders taken before it was recorded. */
  source: string;
  /** GBP or USD where somebody abroad is paying by card. */
  payCurrency: string;
};

export type OrderFilter = {
  status?: Order["status"] | "all";
  batchId?: string | null;
  /** "card" narrows to the people waiting on a card link. */
  paymentMethod?: "transfer" | "card" | null;
  search?: string;
  /** A promoter's code, to show only the orders they brought in. */
  promoter?: string | null;
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

  const promoters = await promoterMap(orders.map((o) => o.customer_phone));

  // Narrowed here rather than in the query: whose promoter a customer is
  // lives on the customer, not the order, so there is nothing to filter on
  // in the orders table itself.
  const wanted = filter.promoter?.trim();
  if (wanted) {
    orders = orders.filter((order) => promoters.get(order.customer_phone)?.code === wanted);
  }

  const lines = await linesFor(orders.map((o) => o.id));
  const batches = await batchMap(orders.map((o) => o.batch_id));
  const pins = await pinMap(orders.map((o) => o.customer_phone));
  const called = await callsThemMap(orders.map((o) => o.customer_phone));

 return orders.map((order) => {
    const batch = batches.get(order.batch_id);
    // The bags get merged by phone at the counter, so the rest of that
    // person's load in this run has to be visible beside it. It no longer
    // changes what either order pays: each one is charged for the room its
    // own containers take.
    const siblings = orders.filter(
      (other) =>
        other.id !== order.id &&
        other.batch_id === order.batch_id &&
        other.customer_phone === order.customer_phone &&
        !isGone(other.status)
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
        ? carLabel(batch)
        : "Unknown run",
      batchStage: batch?.stage ?? "ordering",
      batchKind: batch?.kind ?? "run",
      runDate: batch?.run_date ?? "",
      deliveryWindow: batch?.delivery_window_text ?? "",
      slot: batch?.slot ?? "afternoon",
      pin: pins.get(order.customer_phone) ?? null,
      callsThem: called.get(order.customer_phone) ?? "",
      awaitingGroup: order.group_id ? stillOpen.has(order.group_id) : false,
      promoter: promoters.get(order.customer_phone) ?? null,
      // Older orders have no column and no answer, which reads as empty and
      // is simply not shown.
      source: (order as { source?: string }).source ?? "",
      payCurrency: (order as { pay_currency?: string }).pay_currency ?? "",
    };
  });
}

/**
 * Who brought each of these customers. Two reads rather than a join, because
 * customers and promoters are separate tables with no foreign key between
 * them: the code is written onto the customer as text.
 *
 * Tolerant throughout. A promoter's name is a nicety on an order card, and
 * must never be able to take the orders list down.
 */
async function promoterMap(
  phones: string[]
): Promise<Map<string, { code: string; name: string }>> {
  const unique = [...new Set(phones.filter(Boolean))];
  const map = new Map<string, { code: string; name: string }>();
  if (unique.length === 0) return map;

  const [{ data: customers, error }, { data: promoters }] = await Promise.all([
    db().from("customers").select("phone, promoter_code").in("phone", unique),
    db().from("promoters").select("code, name"),
  ]);
  if (error) return map;

  const names = new Map(
    ((promoters ?? []) as { code: string; name: string }[]).map((one) => [
      one.code,
      one.name || one.code,
    ])
  );

  for (const row of (customers ?? []) as { phone: string; promoter_code?: string | null }[]) {
    const code = (row.promoter_code ?? "").trim();
    if (!code) continue;
    map.set(row.phone, { code, name: names.get(code) ?? code });
  }
  return map;
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

/**
 * What the shop calls each of these people, where somebody has said.
 *
 * Forgiving of a database that has not had the migration run yet: an order
 * feed must not fall over because a greeting could not be looked up.
 */
async function callsThemMap(phones: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(phones)];
  if (unique.length === 0) return new Map();
  try {
    const { data, error } = await db()
      .from("customers")
      .select("phone, calls_them")
      .in("phone", unique);
    if (error) return new Map();
    return new Map(
      (data ?? [])
        .map(
          (row) => [row.phone as string, ((row.calls_them as string) ?? "").trim()] as const
        )
        .filter(([, called]) => called !== "")
    );
  } catch {
    return new Map();
  }
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
  /** Who brought them, if anybody. Written once on a first order and never
   *  touched again, which is what makes a promoter's commission lifetime. */
  promoterCode: string | null;
  /** What to greet them as, where somebody has said. Empty means the first
   *  word of their name, which is only a guess. */
  callsThem: string;
  /** Which front door they use, over all their orders: "app", "web",
   *  "mixed", or empty where none of their orders recorded it. Worth
   *  knowing before pushing an app at somebody who already has it, or
   *  sending a link to somebody who never opens the website. */
  uses: "app" | "web" | "mixed" | "";
  /** Whether they have left a Google review, ticked by hand. Google never
   *  says who wrote what, so the only point of this is to stop the list
   *  asking the same person twice. */
  reviewed: boolean;
};

/**
 * Which door somebody comes through, over everything they have ordered.
 *
 * A clear majority is named, a genuine split is called mixed. Two thirds is
 * the line: half and half is mixed, and three orders to one is not.
 */
function doorFor(sources: string[]): "app" | "web" | "mixed" | "" {
  const said = sources.filter((one) => one === "app" || one === "web");
  if (said.length === 0) return "";
  const app = said.filter((one) => one === "app").length;
  const web = said.length - app;
  if (app >= said.length * 2 / 3) return "app";
  if (web >= said.length * 2 / 3) return "web";
  return "mixed";
}

/** The customer book: who they are, what they have spent, and their PIN. */
export async function customerRows(search?: string): Promise<CustomerRow[]> {
  // Named columns, and a retry without the newest one, so a database that has
  // not had the migration run on it still shows the customer book.
  const full = await db()
    .from("customers")
    .select(
      "phone, name, hostel, pin, admin_note, payment_method, promoter_code, calls_them, reviewed_at"
    )
    .order("name");

  const { data, error } = full.error
    ? await db()
        .from("customers")
        .select("phone, name, hostel, pin, admin_note, promoter_code")
        .order("name")
    : full;
  if (error) throw new Error(error.message);

  // Asked for with the column, and again without it, so a database that has
  // not had the migration still shows the book.
  const asked = await db()
    .from("orders")
    .select("customer_phone, total, status, created_at, source");
  const { data: orders } = asked.error
    ? await db().from("orders").select("customer_phone, total, status, created_at")
    : asked;

  const rows = (data ?? []).map((row) => {
    const mine = (orders ?? []).filter(
      (order) => order.customer_phone === row.phone && !isGone(order.status)
    );
    const paid = mine.filter((order) => isPaid(order.status));
    return {
      phone: row.phone as string,
      name: row.name as string,
      hostel: (row.hostel as string) ?? "",
      pin: (row.pin as string) ?? "",
      note: (row.admin_note as string) ?? "",
      pays: ((row as { payment_method?: string }).payment_method === "card"
        ? "card"
        : "transfer") as "transfer" | "card",
      promoterCode: ((row as { promoter_code?: string | null }).promoter_code ?? null),
      callsThem: ((row as { calls_them?: string }).calls_them ?? ""),
      reviewed: Boolean((row as { reviewed_at?: string | null }).reviewed_at),
      orders: mine.length,
      uses: doorFor(mine.map((order) => String((order as { source?: string }).source ?? ""))),
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
  /** What the codes took off orders, which is what the fee above is net of. */
  discounts: number;
  /**
   * What codes really cost: the money taken off orders, plus the delivery
   * given away by a code that sets the fee outright.
   *
   * The second half was invisible. A code like DOM2K does not discount
   * anything, it prices delivery at two thousand, so the fee column simply
   * reads two thousand and the discount column reads nothing. The dashboard
   * said "after N1,000 of codes" on a month where codes had really cost five,
   * and a flash promotion looked free.
   */
  codesCost: number;
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

  const orders = (data ?? []).filter((order) => !isGone(order.status));
  const paid = orders.filter((order) => isPaid(order.status));

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
  const discounts = paid.reduce(
    (total, order) => total + ((order.discount as number) ?? 0),
    0
  );
  const feeGivenAway = await feeGiven(paid, lines);

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
    discounts,
    codesCost: discounts + feeGivenAway,
    customers: customers ?? 0,
    newCustomers: newCustomers ?? 0,
    averageOrder: paid.length === 0 ? 0 : Math.round(gross / paid.length),
    topItems: [...counts.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    byWeekday: [...weekdays.values()].sort((a, b) => b.gross - a.gross),
  };
}

/**
 * Delivery given away by codes that price the fee outright.
 *
 * A code that takes money off an order writes it into the discount column
 * and is counted everywhere. A code that sets the delivery fee instead
 * leaves no trace at all: the fee column just reads what the promotion
 * charged, and nothing says what the ladder would have.
 *
 * So the ladder is asked again, on what the order actually carried, and the
 * difference is what the promotion cost. Never negative: a promotion that
 * charged more than the ladder would have is not a gift, and counting it as
 * one would hand the dashboard a number that grows when a code earns money.
 */
async function feeGiven(
  paid: Record<string, unknown>[],
  lines: OrderLine[]
): Promise<number> {
  const priced = paid.filter((order) => (order.coupon_code as string | null) ?? "");
  if (priced.length === 0) return 0;

  // Only the codes that set a fee. The rest are already in the discount
  // column, and counting them here would count them twice.
  const { data: coupons } = await db()
    .from("coupons")
    .select("code, applies_to")
    .in("code", [...new Set(priced.map((order) => String(order.coupon_code)))]);
  const setsFee = new Set(
    ((coupons ?? []) as { code: string; applies_to: string }[])
      .filter((one) => one.applies_to === "fee")
      .map((one) => one.code)
  );
  const orders = priced.filter((order) => setsFee.has(String(order.coupon_code)));
  if (orders.length === 0) return 0;

  // How much room each line really took. Read off the item, because
  // order_items does not keep a copy: a drink is a quarter of a container
  // and a deal is three, and counting lines would price a crate of Coke as
  // a crate of pizzas.
  const mine = lines.filter((line) =>
    orders.some((order) => order.id === line.order_id)
  );
  const { data: items } = await db()
    .from("menu_items")
    .select("id, container_pct")
    .in("id", [...new Set(mine.map((line) => line.menu_item_id))]);
  const room = new Map(
    ((items ?? []) as { id: string; container_pct?: number }[]).map((one) => [
      one.id,
      one.container_pct,
    ])
  );

  const bands = await activeBands();
  let given = 0;
  for (const order of orders) {
    const its = mine.filter((line) => line.order_id === order.id);
    if (its.length === 0) continue;
    const ladder = feeFor(
      containersIn(
        its.map((line) => ({ qty: line.qty, container_pct: room.get(line.menu_item_id) }))
      ),
      null,
      bands
    );
    given += Math.max(0, ladder - ((order.fee as number) ?? 0));
  }
  return given;
}
