import { db } from "./supabase";
import { feeFor } from "./fees";
import { activeBands } from "./settings";
import { BATCH_MINIMUM } from "./config";
import { getBatch } from "./batches";
import { isGone, isPaid, NOT_ORDERS_SQL } from "./orders";
import { groupShortfalls, refundsOwed, settleGroupFees, type GroupShortfall } from "./groups";
import { linesFor, type OrderLine } from "./orders";
import type { Batch, Order, Promoter } from "./types";

export type CounterLine = {
  name: string;
  choices: string[];
  qty: number;
  unitPrice: number;
  /** Stable enough to hang a typed-in figure off: the same food ordered by
   *  two people is one line here and one thing to buy. */
  key: string;
  /** What was actually handed over for this line, once somebody has said. */
  paid: number | null;
  /** So a price that has really gone up can be put right on the menu. */
  itemId: string;
  /** What the customer handed back, when they were asked to cover a gap. */
  recovered: number;
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
  /** Groups the shop is covering the difference on, because somebody in
   *  them did not pay. A report, not a charge. */
  groupsShort: GroupShortfall[];
  /** Phone to PIN, for the confirmation message. */
  pins: Record<string, string>;
  summary: {
    paidCount: number;
    unpaidCount: number;
    minimum: number;
    gross: number;
    foodCost: number;
    /** What the menu prices came to, for comparison with what was paid. */
    menuCost: number;
    commission: number;
    /** Who earned it, so a number on a sheet has a name against it. */
    commissionBy: Commission[];
    net: number;
    /** Fuel, driver and anything else bought on the night. */
    costs: number;
    /** What is actually left: gross, less food, commission and those costs. */
    profit: number;
    /** The books for this run: what the menu said, what was handed over at
     *  the counters, and what a customer gave back on the gap. */
    reconciled: {
      /** How many lines have been typed in, of how many on the run. */
      lines: number;
      of: number;
      /** The menu price of only the lines typed in. */
      menu: number;
      /** What was actually handed over for those same lines. */
      paid: number;
      /** What customers handed back on them. */
      recovered: number;
    };
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
    .not("status", "in", NOT_ORDERS_SQL)
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
  const paid = orders.filter((o) => isPaid(o.status));
  const unpaid = orders.filter((o) => o.status === "pending");
  const paidIds = new Set(paid.map((o) => o.id));

  // What each thing really cost, where somebody has said.
  const { data: spendRows } = await db()
    .from("counter_spend")
    .select("line_key, paid, recovered")
    .eq("batch_id", batchId);
  const rows = (spendRows ?? []) as {
    line_key: string;
    paid: number;
    recovered?: number;
  }[];
  const spentOn = new Map(rows.map((row) => [row.line_key, row.paid]));
  // Money the customer handed back, which the shop is therefore not out.
  const gotBack = new Map(rows.map((row) => [row.line_key, row.recovered ?? 0]));

  const { total: commission, by: commissionBy } = await commissionFor(paid);
  const costs =
    batch.fuel_cost + batch.driver_cost + (batch.transport_cost ?? 0) + batch.other_cost;

  // What the food actually cost. The menu price is only a guess at it: buy
  // enough from one counter and they give it to you for less, and that
  // difference is margin the sheet was throwing away.
  const menuCost = sum(paid, (o) => o.subtotal_food);

  // Typed-in figures first, and only for the lines somebody has actually
  // typed: the rest stay at the menu price, so a half-finished reconcile
  // still leaves an honest number rather than a wrong one.
  const counterLines = groupForCounter(lines.filter((l) => paidIds.has(l.order_id)));
  const everyLine = counterLines.flatMap((place) => place.lines);
  const reconciled = everyLine.filter((line) => spentOn.has(line.key));

  const foodCost =
    reconciled.length > 0
      ? everyLine.reduce(
          (total, line) =>
            total +
            (spentOn.has(line.key)
              ? (spentOn.get(line.key) as number) - (gotBack.get(line.key) ?? 0)
              : line.qty * line.unitPrice),
          0
        )
      : batch.food_spend > 0
        ? batch.food_spend
        : menuCost;
  const margin = sum(paid, (o) => o.total) - foodCost;

  return {
    batch,
    counter: groupForCounter(lines.filter((l) => paidIds.has(l.order_id))).map(
      (place) => ({
        ...place,
        lines: place.lines.map((line) => ({
          ...line,
          paid: spentOn.has(line.key) ? (spentOn.get(line.key) as number) : null,
          recovered: gotBack.get(line.key) ?? 0,
        })),
      })
    ),
    handout: bagsFor(paid.map(withLines), await collectingSeparately(batchId)),
    unpaid: unpaid.map(withLines),
    refunds: await refundsOwed(batchId),
    groupsShort: await groupShortfalls(batchId),
    pins: await pinsFor(orders.map((o) => o.customer_phone)),
    summary: {
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      minimum: BATCH_MINIMUM,
      gross: sum(paid, (o) => o.total),
      foodCost,
      /** What the menu said it would cost, so the saving can be shown. */
      menuCost,
      commission,
      commissionBy,
      net: margin - commission,
      costs,
      profit: margin - commission - costs,
      reconciled: {
        lines: reconciled.length,
        of: everyLine.length,
        menu: reconciled.reduce((total, line) => total + line.qty * line.unitPrice, 0),
        paid: reconciled.reduce(
          (total, line) => total + ((spentOn.get(line.key) as number) ?? 0),
          0
        ),
        recovered: reconciled.reduce(
          (total, line) => total + (gotBack.get(line.key) ?? 0),
          0
        ),
      },
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
        key: `${line.restaurant}|${key}`,
        paid: null,
        itemId: line.menu_item_id,
        recovered: 0,
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

export type Commission = {
  code: string;
  name: string;
  orders: number;
  amount: number;
};

/**
 * Commission on a run, by whoever actually earned it.
 *
 * This used to take the first active promoter in alphabetical order and
 * charge their rate against every paid order on the run, whether or not
 * anybody had brought that customer. Written when there was one promoter and
 * they were the reason anybody was ordering at all; with four of them it
 * billed every run for orders nobody introduced, and always to the same
 * person.
 *
 * Now an order earns for the promoter whose customer it is, at that
 * promoter's own rate, and an order that came from nobody costs nothing.
 * Returned broken down as well as totalled, because "promoter commission
 * owed, ₦500" with no name on it is not something anybody can check.
 */
async function commissionFor(
  orders: Order[]
): Promise<{ total: number; by: Commission[] }> {
  if (orders.length === 0) return { total: 0, by: [] };

  const phones = [...new Set(orders.map((one) => one.customer_phone))];
  const [{ data: customers }, { data: promoters }] = await Promise.all([
    db().from("customers").select("phone, promoter_code").in("phone", phones),
    db().from("promoters").select("code, name, rate"),
  ]);

  const broughtBy = new Map(
    ((customers ?? []) as { phone: string; promoter_code?: string | null }[]).map((one) => [
      one.phone,
      (one.promoter_code ?? "").trim(),
    ])
  );
  const rates = new Map(
    ((promoters ?? []) as { code: string; name: string; rate: number }[]).map((one) => [
      one.code,
      one,
    ])
  );

  const tally = new Map<string, Commission>();
  for (const order of orders) {
    const code = broughtBy.get(order.customer_phone) ?? "";
    const promoter = code ? rates.get(code) : undefined;
    if (!promoter) continue;

    const now = tally.get(code) ?? {
      code,
      name: promoter.name || code,
      orders: 0,
      amount: 0,
    };
    tally.set(code, {
      ...now,
      orders: now.orders + 1,
      amount: now.amount + promoter.rate,
    });
  }

  const by = [...tally.values()].sort((a, b) => b.amount - a.amount);
  return { total: by.reduce((sum, one) => sum + one.amount, 0), by };
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

export type SameDayTrip = {
  /** The earliest time in the cluster, which is when you have to leave. */
  at: string;
  label: string;
  /** Every time asked for in this trip, earliest first. */
  times: string[];
  batchIds: string[];
  orders: number;
  paid: number;
  unpaid: number;
  items: number;
  gross: number;
};

/*
 * How close together two cars have to be to be one walk to the counter.
 *
 * This was five hours, which put a noon delivery and a quarter to five in
 * the same trip and called them one shopping. They are not: the noon food
 * would sit in a warmer for most of the afternoon, and nobody reading the
 * sheet believed it.
 *
 * An hour and a half is the honest figure. Long enough that half past
 * twelve joins twelve, short enough that the food is still what somebody
 * ordered when it arrives.
 */
const ONE_TRIP_MINUTES = 90;

/** The cars going out, clustered into the trips somebody actually makes. */
async function sameDayClusters(): Promise<
  { at: string; label: string; times: string[]; batchIds: string[] }[]
> {
  const from = new Date(Date.now() - 12 * 3600_000).toISOString();

  const { data, error } = await db()
    .from("batches")
    .select("id, deliver_at, delivery_window_text, stage")
    .eq("kind", "same_day")
    .not("deliver_at", "is", null)
    .gte("deliver_at", from)
    // Only cars nobody has shopped for yet. This is a list of what to buy,
    // and a car that has been to the counter, is on the road or has been
    // handed out is not a decision any more: it showed this afternoon's
    // deliveries, both already gone, and asked somebody to do something
    // about them.
    .in("stage", ["ordering", "closed"])
    .order("deliver_at");

  // A database without `kind` yet has no same day cars in it either.
  if (error) return [];

  const rows = (data ?? []) as {
    id: string;
    deliver_at: string;
    delivery_window_text: string;
  }[];

  const clusters: { at: string; label: string; times: string[]; batchIds: string[] }[] = [];

  for (const row of rows) {
    const open = clusters[clusters.length - 1];
    const within =
      open !== undefined &&
      new Date(row.deliver_at).getTime() - new Date(open.at).getTime() <=
        ONE_TRIP_MINUTES * 60_000;

    if (within) {
      open.batchIds.push(row.id);
      if (!open.times.includes(row.delivery_window_text)) {
        open.times.push(row.delivery_window_text);
      }
    } else {
      clusters.push({
        // The earliest, because that is the one you cannot be late for.
        at: row.deliver_at,
        label: row.delivery_window_text,
        times: [row.delivery_window_text],
        batchIds: [row.id],
      });
    }
  }

  return clusters;
}

/**
 * Same day cars going out close enough together to be one trip.
 *
 * Every one of these is its own batch, because each was one person asking for
 * a car, and each keeps its own fuel and its own profit. Ten people asking for
 * two o'clock is ten batches and, to whoever is buying the food, one trip.
 */
export async function sameDayTrips(): Promise<SameDayTrip[]> {
  const clusters = await sameDayClusters();
  if (clusters.length === 0) return [];

  const everyId = clusters.flatMap((one) => one.batchIds);
  const { data: orders } = await db()
    .from("orders")
    .select("id, batch_id, status, total")
    .in("batch_id", everyId)
    .not("status", "in", NOT_ORDERS_SQL);

  const live = (orders ?? []) as {
    id: string;
    batch_id: string;
    status: string;
    total: number;
  }[];

  const { data: items } = live.length
    ? await db()
        .from("order_items")
        .select("order_id, qty")
        .in("order_id", live.map((one) => one.id))
    : { data: [] as { order_id: string; qty: number }[] };

  const trips = clusters.map((cluster) => {
    const mine = live.filter((one) => cluster.batchIds.includes(one.batch_id));
    const paid = mine.filter((one) => isPaid(one.status));

    return {
      at: cluster.at,
      label: cluster.label,
      times: cluster.times,
      batchIds: cluster.batchIds,
      orders: mine.length,
      paid: paid.length,
      unpaid: mine.length - paid.length,
      items: (items ?? [])
        .filter((line) => mine.some((one) => one.id === line.order_id))
        .reduce((sum, line) => sum + (line.qty as number), 0),
      gross: paid.reduce((sum, one) => sum + one.total, 0),
    };
  });

  // Only trips somebody is actually going on.
  return trips.filter((trip) => trip.orders > 0);
}

export type TripSheet = {
  at: string;
  label: string;
  counter: CounterGroup[];
  handout: HandoutOrder[];
  unpaid: HandoutOrder[];
  items: number;
  gross: number;
};

/**
 * Everything going out on one trip, as one shopping list.
 *
 * The counter list is the point: what to buy, by restaurant, across every car
 * in the cluster. Separate sheets per car is a separate chance to miss a
 * drink on each of them.
 */
export async function tripSheet(at: string): Promise<TripSheet | null> {
  // Clustered the same way the list clusters, or opening a trip would show a
  // different set of cars from the one that was listed.
  const cluster = (await sameDayClusters()).find((one) => one.at === at);
  if (!cluster) return null;

  const { data } = await db()
    .from("orders")
    .select("*")
    .in("batch_id", cluster.batchIds)
    .not("status", "in", NOT_ORDERS_SQL)
    .order("customer_name");

  const orders = (data ?? []) as Order[];
  const lines = await linesFor(orders.map((o) => o.id));
  const byOrder = new Map<string, OrderLine[]>();
  for (const line of lines) {
    byOrder.set(line.order_id, [...(byOrder.get(line.order_id) ?? []), line]);
  }
  const withLines = (o: Order): HandoutOrder => ({ ...o, lines: byOrder.get(o.id) ?? [] });

  // Unpaid food is not bought, here as everywhere else.
  const paid = orders.filter((o) => isPaid(o.status));
  const paidIds = new Set(paid.map((o) => o.id));

  return {
    at,
    label: cluster.times.join(" and "),
    counter: groupForCounter(lines.filter((line) => paidIds.has(line.order_id))),
    handout: paid.map(withLines),
    unpaid: orders.filter((o) => o.status === "pending").map(withLines),
    items: lines
      .filter((line) => paidIds.has(line.order_id))
      .reduce((sum, line) => sum + line.qty, 0),
    gross: sum(paid, (o) => o.total),
  };
}

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
    .select("id, batch_id, status, total, subtotal_food")
    .in("batch_id", rows.map((b) => b.id))
    .not("status", "in", NOT_ORDERS_SQL);

  const all = (orders ?? []) as Pick<
    Order,
    "id" | "batch_id" | "status" | "total" | "subtotal_food"
  >[];

  // What the counters really charged, where it has been said. Without this
  // the list and the dashboard priced every run at the menu and disagreed
  // with the run's own sheet, which is the one that had been reconciled.
  const extra = await overMenu(rows, all);
  // Per run rather than one total shared out by order count. Sharing was
  // only ever right when every order earned the same for the same person;
  // with four promoters on different rates, and orders that earn nobody
  // anything, a run's share had little to do with what it actually owed.
  const owed = new Map<string, number>();
  for (const b of rows) {
    const mine = all.filter((o) => o.batch_id === b.id && isPaid(o.status)) as Order[];
    owed.set(b.id, (await commissionFor(mine)).total);
  }

  return rows.map((b) => {
    const mine = all.filter((o) => o.batch_id === b.id && !isGone(o.status));
    const paid = mine.filter((o) => isPaid(o.status));
    const margin = sum(paid, (o) => o.total - o.subtotal_food);
    const costs = b.fuel_cost + b.driver_cost + (b.transport_cost ?? 0) + b.other_cost;

    return {
      ...b,
      orderCount: mine.length,
      paidCount: paid.length,
      gross: sum(paid, (o) => o.total),
      profit: Math.round(
        margin - (extra.get(b.id) ?? 0) - (owed.get(b.id) ?? 0) - costs
      ),
    };
  });
}

/**
 * What the food cost above the menu, per run, or below it as a negative.
 *
 * The menu price is a guess at what a counter will charge, and the run's own
 * sheet replaces that guess with what was really handed over. That correction
 * lived only on the sheet, so a run reconciled down to a real saving still
 * read at menu prices everywhere else and the dashboard disagreed with the
 * run it was summing.
 *
 * Only runs somebody has actually reconciled are looked at: the rest are at
 * the menu price by definition, and reading every line of every run to learn
 * that would be a great deal of work to arrive back where we started.
 */
async function overMenu(
  batches: Batch[],
  orders: Pick<Order, "id" | "batch_id" | "status" | "subtotal_food">[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (batches.length === 0) return out;

  const paidIn = (batchId: string) =>
    orders.filter((o) => o.batch_id === batchId && isPaid(o.status));
  const menuOf = (batchId: string) => sum(paidIn(batchId), (o) => o.subtotal_food);

  // One figure for the whole shop, which is the older way and needs no lines.
  for (const batch of batches) {
    const menu = menuOf(batch.id);
    if (batch.food_spend > 0 && menu > 0) out.set(batch.id, batch.food_spend - menu);
  }

  let spend: { batch_id: string; line_key: string; paid: number; recovered?: number }[] = [];
  try {
    const { data } = await db()
      .from("counter_spend")
      .select("batch_id, line_key, paid, recovered")
      .in("batch_id", batches.map((b) => b.id));
    spend = (data ?? []) as typeof spend;
  } catch {
    return out;
  }
  if (spend.length === 0) return out;

  const reconciledIds = [...new Set(spend.map((row) => row.batch_id))];
  const wanted = orders.filter(
    (o) => reconciledIds.includes(o.batch_id) && isPaid(o.status)
  );
  const lines = await linesFor(wanted.map((o) => o.id));
  const batchOfOrder = new Map(wanted.map((o) => [o.id, o.batch_id]));

  for (const id of reconciledIds) {
    const mine = lines.filter((line) => batchOfOrder.get(line.order_id) === id);
    const everyLine = groupForCounter(mine).flatMap((place) => place.lines);
    const rows = spend.filter((row) => row.batch_id === id);
    const spentOn = new Map(rows.map((row) => [row.line_key, row.paid]));
    const gotBack = new Map(rows.map((row) => [row.line_key, row.recovered ?? 0]));

    // Lines nobody typed stay at the menu price, exactly as the sheet has it.
    const real = everyLine.reduce(
      (total, line) =>
        total +
        (spentOn.has(line.key)
          ? (spentOn.get(line.key) as number) - (gotBack.get(line.key) ?? 0)
          : line.qty * line.unitPrice),
      0
    );
    // The per line figures win over one figure for the whole shop, which is
    // what the run's own sheet does.
    out.set(id, real - menuOf(id));
  }

  return out;
}

export type PromoterPayout = {
  id: string;
  amount: number;
  note: string;
  paid_at: string;
  /** When they said it landed. Null until they do. */
  confirmed_at: string | null;
};

export type PromoterRow = Promoter & {
  payouts: PromoterPayout[];
  /** Paid orders carrying this code, which is what commission is earned on. */
  orders: number;
  earned: number;
  paidOut: number;
  owed: number;
};

/** Per-promoter order counts, so commission is calculable (brief §13). */
export async function promoterRows(): Promise<PromoterRow[]> {
  const { data: promoters } = await db().from("promoters").select("*").order("code");
  const { data: orders } = await db()
    .from("orders")
    .select("status, customer_phone")
    .not("status", "in", NOT_ORDERS_SQL);
  const { data: payouts } = await db()
    .from("promoter_payouts")
    .select("id, promoter_code, amount, note, paid_at, confirmed_at")
    .order("paid_at", { ascending: false });

  // Whose customer is whose. Every paid order in the shop used to count
  // towards every promoter, so two of them would each be credited for the
  // same sale, and the first one listed collected for work nobody did.
  const { data: customers } = await db()
    .from("customers")
    .select("phone, promoter_code");
  const broughtBy = new Map(
    ((customers ?? []) as { phone: string; promoter_code?: string | null }[]).map((one) => [
      one.phone,
      one.promoter_code ?? "",
    ])
  );

  return ((promoters ?? []) as Promoter[]).map((p) => {
    // Only a paid order earns: an unpaid one never travelled.
    const count = (orders ?? []).filter(
      (o) =>
        isPaid(o.status) &&
        broughtBy.get(o.customer_phone as string) === p.code
    ).length;
    const earned = count * p.rate;
    const paidOut = (payouts ?? [])
      .filter((row) => row.promoter_code === p.code)
      .reduce((total, row) => total + (row.amount as number), 0);

    return {
      ...p,
      orders: count,
      earned,
      paidOut,
      owed: Math.max(0, earned - paidOut),
      payouts: (payouts ?? []).filter(
        (row) => row.promoter_code === p.code
      ) as PromoterPayout[],
    };
  });
}

/**
 * What a run usually costs to drive, from the runs that have been driven.
 *
 * Profit on a run that has not happened yet ignores fuel and the driver,
 * because nobody has typed them in. That makes an open run look better than it
 * is, at exactly the moment the decision to drive is being made. Averaging the
 * last few runs that did have costs entered is a far better guess than zero.
 *
 * Null when there is nothing to average yet, so the page can say it does not
 * know rather than inventing a number.
 */
export async function typicalCosts(): Promise<number | null> {
  // Named columns, so the query fails outright if one of them is not there
  // yet. The fallback is the same question without the newest column.
  const read = (withTransport: boolean) =>
    db()
      .from("batches")
      .select(
        withTransport
          ? "fuel_cost, driver_cost, transport_cost, other_cost"
          : "fuel_cost, driver_cost, other_cost"
      )
      .eq("stage", "handed_out")
      .order("run_date", { ascending: false })
      .limit(6)
      .overrideTypes<
        {
          fuel_cost: number;
          driver_cost: number;
          transport_cost?: number;
          other_cost: number;
        }[]
      >();

  let { data, error } = await read(true);
  if (error) ({ data } = await read(false));

  const runs = (data ?? [])
    .map(
      (row) =>
        (row.fuel_cost ?? 0) +
        (row.driver_cost ?? 0) +
        (row.transport_cost ?? 0) +
        (row.other_cost ?? 0)
    )
    .filter((cost) => cost > 0);

  if (runs.length === 0) return null;
  return Math.round(runs.reduce((sum, cost) => sum + cost, 0) / runs.length);
}

export type Shortfall = {
  groupId: string;
  leader: string;
  people: number;
  paidPeople: number;
  /** Delivery money actually in, from the ones who paid. */
  collected: number;
  /** What carrying only the paid food is worth at the bands. */
  needed: number;
  /** Positive when the money in does not cover the car. */
  short: number;
  unpaid: { id: string; name: string; phone: string; owed: number }[];
};

/**
 * Shared deliveries where the money does not cover the car.
 *
 * Everybody in a shared delivery pays an even share of one fee. When some of
 * them never pay, their food does not travel, but the fee for what is left
 * does not fall as fast as the heads do, so what came in can be less than the
 * car is worth. Nobody can be asked for more after the fact, so this is a
 * judgement for whoever is driving: chase them, carry it and wear the
 * difference, or refund the ones who paid and drop it.
 *
 * Saying the exact figure is the whole job here. A shortfall nobody sees is
 * one that turns up later as a run that mysteriously made no money.
 */
export async function shortfalls(batchId: string): Promise<Shortfall[]> {
  // Same tolerance as the orders feed: the run page is the busiest thing in
  // admin and must not depend on a migration having been run first.
  const { data: groups, error } = await db()
    .from("order_groups")
    .select("id, leader_name")
    .eq("batch_id", batchId)
    .not("closes_at", "is", null);

  if (error || !groups || groups.length === 0) return [];

  const bands = await activeBands();
  const { data: batch } = await db()
    .from("batches")
    .select("flash_fee")
    .eq("id", batchId)
    .maybeSingle();

  const out: Shortfall[] = [];

  for (const group of groups) {
    const { data: rows } = await db()
      .from("orders")
      .select("id, customer_name, for_name, customer_phone, fee, total, status")
      .eq("group_id", group.id as string)
      .not("status", "in", NOT_ORDERS_SQL);

    const orders = rows ?? [];
    if (orders.length === 0) continue;

    const paid = orders.filter((one) => isPaid(one.status));
    const unpaid = orders.filter((one) => one.status === "pending");
    if (unpaid.length === 0) continue;

    const { data: items } = await db()
      .from("order_items")
      .select("order_id, qty")
      .in("order_id", paid.map((one) => one.id as string));

    const travelling = (items ?? []).reduce((sum, row) => sum + (row.qty as number), 0);
    const collected = paid.reduce((sum, one) => sum + (one.fee as number), 0);
    const needed = paid.length
      ? feeFor(travelling, (batch?.flash_fee as number | null) ?? null, bands)
      : 0;

    out.push({
      groupId: group.id as string,
      leader: group.leader_name as string,
      people: orders.length,
      paidPeople: paid.length,
      collected,
      needed,
      short: Math.max(0, needed - collected),
      unpaid: unpaid.map((one) => ({
        id: one.id as string,
        name: (one.for_name as string) ?? (one.customer_name as string),
        phone: one.customer_phone as string,
        owed: one.total as number,
      })),
    });
  }

  return out.filter((one) => one.short > 0 || one.unpaid.length > 0);
}

/**
 * What is still open on a run, in the words somebody would use about it.
 *
 * Delivered is about the food. This is about the money, and the two are days
 * apart: a run lands, and then there is a counter sheet to price, fuel to put
 * in and the odd person who never paid. Until all of that is done the run is
 * not finished, however long ago the bags went out.
 *
 * Only the things that can be checked are checked. Whether every price on the
 * counter sheet is right is not one of them, which is what the confirmation
 * is for: somebody saying they have been through it.
 */
export function stillOpen(sheet: BatchSheet): string[] {
  const open: string[] = [];

  if (sheet.batch.stage !== "handed_out") {
    open.push("The food has not been marked delivered yet.");
  }
  if (sheet.summary.unpaidCount > 0) {
    open.push(
      `${sheet.summary.unpaidCount} order${
        sheet.summary.unpaidCount === 1 ? "" : "s"
      } never paid. Chase them, or refund and cancel.`
    );
  }
  if (sheet.refunds.length > 0) {
    open.push(
      `${sheet.refunds.length} refund${
        sheet.refunds.length === 1 ? " is" : "s are"
      } still owed.`
    );
  }
  if (sheet.summary.costs === 0) {
    open.push("No fuel, transport or driver has been put in.");
  }
  if (sheet.groupsShort.length > 0) {
    open.push(
      `${sheet.groupsShort.length} shared delivery is short. Chase it, carry it, or refund.`
    );
  }

  return open;
}

/** Lines nobody priced at the counter. Worth saying, not worth blocking. */
export function notPriced(sheet: BatchSheet): number {
  return sheet.summary.reconciled.of - sheet.summary.reconciled.lines;
}
