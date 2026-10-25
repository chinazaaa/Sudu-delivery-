import { db } from "./supabase";
import { WINDOW_DAYS } from "./other-money";
import { activeBands } from "./settings";
import { feeFor } from "./fees";
import { containersIn } from "./containers";
import { carLabel } from "./view";
import { isGone, isPaid, linesFor, NOT_ORDERS_SQL, type OrderLine } from "./orders";
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
  /** Whether this customer has been ticked as having left a Google review,
   *  so the order that has just gone out can carry the tick. Whoever paid,
   *  which on a household order is not whoever ate. */
  reviewed: boolean;
  /** The same, for the person the order is being handed to, where the
   *  order names one. A review is asked of a person once and never again,
   *  and the two halves of a household are two people: a father who has
   *  reviewed does not answer for his son, and nor his son for him. */
  reviewedFor: boolean;
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
  /*
   * Three questions about the same orders, asked at once.
   *
   * The promoters are wanted a little further down, after the search has
   * narrowed the list, but the answer is a map keyed by phone: asking about
   * a few more numbers than are kept costs nothing, and asking about them
   * here saves a whole wait. This function is read twice on the dashboard
   * alone and on every list in admin.
   */
  const [groups, stillOpen, promoters] = await Promise.all([
    groupMap(orders.map((o) => o.group_id)),
    openGroups(orders.map((o) => o.group_id)),
    promoterMap(orders.map((o) => o.customer_phone)),
  ]);

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

  // Narrowed here rather than in the query: whose promoter a customer is
  // lives on the customer, not the order, so there is nothing to filter on
  // in the orders table itself.
  const wanted = filter.promoter?.trim();
  if (wanted) {
    orders = orders.filter((order) => promoters.get(order.customer_phone)?.code === wanted);
  }

  /*
   * Asked of each of them, not of the household.
   *
   * A father pays and his son eats, and they are two people who each ate
   * nothing of each other's opinion: two reviews is the point, not one.
   * So the tick stays on the person it belongs to, and the shop can ask
   * both. Moving a tick to the half who actually wrote it is a job for
   * the customer page, which has a button for each of them.
   */
  // Both halves, because each of them is asked once and the tick belongs
  // to whichever of them actually left one.
  // And the last five together, now the list is final: its lines, its runs,
  // the PINs, who to call and who has already been asked for a word.
  const [lines, batches, pins, called, reviewed] = await Promise.all([
    linesFor(orders.map((o) => o.id)),
    batchMap(orders.map((o) => o.batch_id)),
    pinMap(orders.map((o) => o.customer_phone)),
    callsThemMap(orders.map((o) => o.customer_phone)),
    reviewedMap(
      orders.flatMap((o) => [
        o.customer_phone,
        String((o as { deliver_to_phone?: string | null }).deliver_to_phone ?? ""),
      ])
    ),
  ]);

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
      reviewed: reviewed.has(order.customer_phone),
      reviewedFor: reviewed.has(String(order.deliver_to_phone ?? "")),
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
 * Who has already left a Google review, by number.
 *
 * Ticked by hand in admin, because Google never says who wrote what. It is
 * here so an order that has gone out can carry the tick itself: the moment
 * somebody tells you they left one is the moment you are looking at their
 * order, not the moment you are reading the customer book.
 *
 * Forgiving of a database without the column, for the same reason every
 * other lookup here is: an order feed must not fall over for a tick.
 */
async function reviewedMap(phones: string[]): Promise<Set<string>> {
  const unique = [...new Set(phones.filter((one) => one !== ""))];
  if (unique.length === 0) return new Set();
  try {
    const { data, error } = await db()
      .from("customers")
      .select("phone, reviewed_at")
      .in("phone", unique);
    if (error) return new Set();
    return new Set(
      ((data ?? []) as { phone: string; reviewed_at: string | null }[])
        .filter((row) => Boolean(row.reviewed_at))
        .map((row) => row.phone)
    );
  } catch {
    return new Set();
  }
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
  /**
   * Whoever pays for this one, where somebody has said so.
   *
   * Never assumed. At this university a student may well be paying for
   * their own food, and a shop that guesses otherwise insults the people
   * it most wants to keep. It is written down when they say it: "my mum
   * will pay for the monthly one" is the sentence that turns a student
   * into an introduction to the customer this shop is trying to reach.
   */
  parentName: string;
  parentPhone: string;
  /** Whether this one is the parent of the pair, ticked by hand. Only the
   *  parent is marked: a student is the ordinary case, and labelling them
   *  "child" is talking down to the people the shop feeds. */
  isParent: boolean;
  /** The place they came through, where somebody has said: ChatGPT,
   *  Instagram, a poster. Not a person and pays nobody. */
  cameFrom: string;
  /** How many boxes somebody else paid for and had sent to them. Counted
   *  apart from their own: a son whose father orders for him has placed
   *  nothing himself, and what he has spent is still nothing. */
  sent: number;
  /** Which front door they use, over all their orders: "app", "web",
   *  "bot", "mixed", or empty where none of their orders recorded it.
   *  Worth knowing before pushing an app at somebody who already has it,
   *  sending a link to somebody who never opens the website, or deciding
   *  whether the chat is earning its keep. */
  uses: "app" | "web" | "bot" | "mixed" | "";
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
function doorFor(sources: string[]): "app" | "web" | "bot" | "mixed" | "" {
  const doors = ["app", "web", "bot"] as const;
  const said = sources.filter((one): one is (typeof doors)[number] =>
    (doors as readonly string[]).includes(one)
  );
  if (said.length === 0) return "";
  for (const door of doors) {
    if (said.filter((one) => one === door).length >= (said.length * 2) / 3) return door;
  }
  return "mixed";
}

/** The customer book: who they are, what they have spent, and their PIN. */
export async function customerRows(search?: string): Promise<CustomerRow[]> {
  // Named columns, and a retry without the newest one, so a database that has
  // not had the migration run on it still shows the customer book.
  const full = await db()
    .from("customers")
    .select(
      // parent_name and parent_phone were read below and never asked for
      // here, so every row in the book came back with an empty household.
      "phone, name, hostel, pin, admin_note, payment_method, promoter_code, calls_them, came_from, parent_name, parent_phone, is_parent, reviewed_at"
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
    .select("customer_phone, deliver_to_phone, total, status, created_at, source");
  const { data: orders } = asked.error
    ? await db()
        .from("orders")
        .select("customer_phone, deliver_to_phone, total, status, created_at")
    : asked;

  const rows = (data ?? []).map((row) => {
    const mine = (orders ?? []).filter(
      (order) => order.customer_phone === row.phone && !isGone(order.status)
    );
    const paid = mine.filter((order) => isPaid(order.status));
    /*
     * Boxes somebody else paid for and had sent to them.
     *
     * A son whose father orders for him has placed nothing himself, and
     * the book said "No orders yet" next to a name with two deliveries
     * against it. Counted apart from his own rather than added to them,
     * because what he has spent is still nothing and the two numbers
     * must not each claim the same order.
     */
    const sent = (orders ?? []).filter(
      (order) =>
        String((order as { deliver_to_phone?: string | null }).deliver_to_phone ?? "") ===
          row.phone &&
        order.customer_phone !== row.phone &&
        !isGone(order.status)
    );
    return {
      phone: row.phone as string,
      sent: sent.length,
      name: row.name as string,
      hostel: (row.hostel as string) ?? "",
      pin: (row.pin as string) ?? "",
      note: (row.admin_note as string) ?? "",
      pays: ((row as { payment_method?: string }).payment_method === "card"
        ? "card"
        : "transfer") as "transfer" | "card",
      promoterCode: ((row as { promoter_code?: string | null }).promoter_code ?? null),
      callsThem: ((row as { calls_them?: string }).calls_them ?? ""),
      parentName: ((row as { parent_name?: string }).parent_name ?? ""),
      parentPhone: ((row as { parent_phone?: string }).parent_phone ?? ""),
      isParent: Boolean((row as { is_parent?: boolean }).is_parent),
      cameFrom: ((row as { came_from?: string }).came_from ?? ""),
      reviewed: Boolean((row as { reviewed_at?: string | null }).reviewed_at),
      orders: mine.length,
      uses: doorFor(mine.map((order) => String((order as { source?: string }).source ?? ""))),
      spend: paid.reduce((total, order) => total + (order.total as number), 0),
      lastOrder:
        mine.map((order) => order.created_at as string).sort().at(-1) ?? null,
    };
  });

  /*
   * A promoter who has never ordered is not a customer.
   *
   * Signing somebody up as a promoter leaves a row with their number on
   * it, so the book carried people who have sold for the shop and never
   * bought from it, sitting among the customers with nought against their
   * name and nothing to do about it.
   *
   * Only while they have not ordered. A promoter who buys her own lunch
   * is a customer like anybody else that same afternoon, and the row
   * comes back on its own.
   */
  const { data: sellers } = await db().from("promoters").select("phone");
  const selling = new Set(
    ((sellers ?? []) as { phone: string | null }[])
      .map((one) => String(one.phone ?? "").trim())
      .filter((one) => one !== "")
  );
  const book = rows.filter((row) => !(row.orders === 0 && selling.has(row.phone)));

  const term = search?.trim().toLowerCase();
  if (!term) return book;
  return book.filter(
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
export async function dashboard(days = WINDOW_DAYS): Promise<Dashboard> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await db()
    .from("orders")
    .select("id, total, fee, discount, status, created_at, customer_phone, batch_id")
    .gte("created_at", since);
  if (error) throw new Error(error.message);

  const orders = (data ?? []).filter((order) => !isGone(order.status));
  const paid = orders.filter((order) => isPaid(order.status));

  /*
   * Everything about the window at once.
   *
   * The lines, the runs they belong to and the two customer counts were
   * four waits one after the other, and the dashboard cannot draw a tile
   * until all four are in. They have nothing to say to each other.
   */
  const [lines, batches, { count: customers }, { count: newCustomers }] =
    await Promise.all([
      linesFor(paid.map((order) => order.id as string)),
      batchMap(paid.map((order) => order.batch_id as string)),
      db().from("customers").select("phone", { count: "exact", head: true }),
      db()
        .from("customers")
        .select("phone", { count: "exact", head: true })
        .gte("created_at", since),
    ]);

  const counts = new Map<string, { name: string; restaurant: string; qty: number }>();
  for (const line of lines) {
    const key = `${line.name}|${line.restaurant}`;
    const seen = counts.get(key);
    if (seen) seen.qty += line.qty;
    else counts.set(key, { name: line.name, restaurant: line.restaurant, qty: line.qty });
  }

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

/**
 * How many orders sit behind each tab, for the numbers on the filter pills.
 *
 * The tabs used to be seven words with nothing to choose between them, so
 * finding the three unpaid orders meant opening tabs until one had rows in
 * it. One grouped read answers all seven.
 *
 * Card payers are unpaid orders narrowed by how they said they would pay,
 * so they are counted separately and stay inside the unpaid number: an
 * order waiting on a card link is still money on the table.
 */
export async function statusCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    const { data, error } = await db()
      .from("orders")
      .select("status, payment_method")
      .limit(5000);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as { status: string; payment_method: string | null }[];
    for (const row of rows) {
      out[row.status] = (out[row.status] ?? 0) + 1;
      if (row.status === "pending" && row.payment_method === "card") {
        out.card = (out.card ?? 0) + 1;
      }
    }
    out.all = rows.length;
  } catch {
    // A number on a tab is never worth failing the page it labels.
  }
  return out;
}

/**
 * Orders still waiting on money, for matching a payment alert against.
 *
 * Only the unpaid ones, because an alert is about money arriving and an
 * order already marked paid is not waiting for any. Only what the match
 * needs, because this runs beside a page of letters and has no business
 * reading the whole order feed to compare two numbers.
 */
export async function unpaidOrdersForMatching(): Promise<
  {
    id: string;
    order_no: number | null;
    customer_name: string;
    total: number;
    created_at: string;
  }[]
> {
  try {
    const { data, error } = await db()
      .from("orders")
      .select("id, order_no, customer_name, total, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) return [];
    return (data ?? []) as unknown as {
      id: string;
      order_no: number | null;
      customer_name: string;
      total: number;
      created_at: string;
    }[];
  } catch {
    return [];
  }
}

/**
 * Orders already marked paid, for the other half of the same question.
 *
 * An alert with nothing unpaid of that amount is nearly always an alert for
 * an order somebody has already dealt with, and saying which one turns a
 * card you have to go and check into a card you can read. Paid only, and
 * only the recent ones: an alert is about money that moved this week.
 */
export async function paidOrdersForMatching(): Promise<
  {
    id: string;
    order_no: number | null;
    customer_name: string;
    total: number;
    paid_at: string | null;
  }[]
> {
  try {
    const { data, error } = await db()
      .from("orders")
      .select("id, order_no, customer_name, total, paid_at")
      .not("paid_at", "is", null)
      // Cancelled and refunded carry a paid_at too, and neither is an
      // answer to "where did this money go": one was never money and the
      // other is money we sent back.
      .not("status", "in", NOT_ORDERS_SQL)
      .order("paid_at", { ascending: false })
      .limit(300);
    if (error) return [];
    return (data ?? []) as unknown as {
      id: string;
      order_no: number | null;
      customer_name: string;
      total: number;
      paid_at: string | null;
    }[];
  } catch {
    return [];
  }
}
