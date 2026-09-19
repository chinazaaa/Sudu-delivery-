import { db } from "./supabase";
import { feeFor } from "./fees";
import { activeBands } from "./settings";
import { BATCH_MINIMUM } from "./config";
import { getBatch } from "./batches";
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

  const commission = await commissionFor(paid);
  const costs = batch.fuel_cost + batch.driver_cost + batch.other_cost;

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
      net: margin - commission,
      costs,
      profit: margin - commission - costs,
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

/**
 * Commission on a run: every paid order, at the promoter's rate. There is one
 * promoter and they are the reason anybody is ordering, so it is not a matter
 * of which orders carried a code.
 */
async function commissionFor(orders: Order[]): Promise<number> {
  if (orders.length === 0) return 0;

  const { data } = await db()
    .from("promoters")
    .select("rate")
    .eq("active", true)
    .order("code")
    .limit(1)
    .maybeSingle();

  return orders.length * ((data?.rate as number) ?? 0);
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
  /** The instant they all asked for, which is what makes it one trip. */
  at: string;
  label: string;
  batchIds: string[];
  orders: number;
  paid: number;
  unpaid: number;
  items: number;
  gross: number;
};

/**
 * Same day cars going to the same place at the same time.
 *
 * Every one of these is its own batch, because each was one person asking for
 * a car. Ten people asking for two o'clock is ten batches and, to whoever is
 * buying the food, one trip. Reading it as ten was going to mean ten counter
 * sheets and no list of what to actually buy.
 */
export async function sameDayTrips(): Promise<SameDayTrip[]> {
  const from = new Date(Date.now() - 12 * 3600_000).toISOString();

  const { data, error } = await db()
    .from("batches")
    .select("id, deliver_at, delivery_window_text")
    .eq("kind", "same_day")
    .not("deliver_at", "is", null)
    .gte("deliver_at", from)
    .order("deliver_at");

  // A database without `kind` yet has no same day cars in it either.
  if (error) return [];

  const rows = (data ?? []) as {
    id: string;
    deliver_at: string;
    delivery_window_text: string;
  }[];
  if (rows.length === 0) return [];

  const { data: orders } = await db()
    .from("orders")
    .select("id, batch_id, status, total")
    .in("batch_id", rows.map((one) => one.id))
    .neq("status", "refunded");

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

  const byTime = new Map<string, SameDayTrip>();

  for (const row of rows) {
    const trip = byTime.get(row.deliver_at) ?? {
      at: row.deliver_at,
      label: row.delivery_window_text,
      batchIds: [],
      orders: 0,
      paid: 0,
      unpaid: 0,
      items: 0,
      gross: 0,
    };

    trip.batchIds.push(row.id);
    for (const order of live.filter((one) => one.batch_id === row.id)) {
      trip.orders += 1;
      if (order.status === "pending") trip.unpaid += 1;
      else {
        trip.paid += 1;
        trip.gross += order.total;
      }
      trip.items += (items ?? [])
        .filter((line) => line.order_id === order.id)
        .reduce((sum, line) => sum + (line.qty as number), 0);
    }

    byTime.set(row.deliver_at, trip);
  }

  // Only trips somebody is actually going on.
  return [...byTime.values()].filter((trip) => trip.orders > 0);
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
 * Everything going out at one time, as one shopping trip.
 *
 * The counter list is the point: what to buy, by restaurant, across every car
 * asked for at this time. Ten separate sheets is ten chances to miss a drink.
 */
export async function tripSheet(at: string): Promise<TripSheet | null> {
  const { data: batches } = await db()
    .from("batches")
    .select("id, delivery_window_text")
    .eq("kind", "same_day")
    .eq("deliver_at", at);

  const cars = (batches ?? []) as { id: string; delivery_window_text: string }[];
  if (cars.length === 0) return null;

  const { data } = await db()
    .from("orders")
    .select("*")
    .in("batch_id", cars.map((one) => one.id))
    .neq("status", "refunded")
    .order("customer_name");

  const orders = (data ?? []) as Order[];
  const lines = await linesFor(orders.map((o) => o.id));
  const byOrder = new Map<string, OrderLine[]>();
  for (const line of lines) {
    byOrder.set(line.order_id, [...(byOrder.get(line.order_id) ?? []), line]);
  }
  const withLines = (o: Order): HandoutOrder => ({ ...o, lines: byOrder.get(o.id) ?? [] });

  // Unpaid food is not bought, here as everywhere else.
  const paid = orders.filter((o) => o.status !== "pending");
  const paidIds = new Set(paid.map((o) => o.id));

  return {
    at,
    label: cars[0].delivery_window_text,
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
    .select("batch_id, status, total, subtotal_food")
    .in("batch_id", rows.map((b) => b.id));

  const all = (orders ?? []) as Pick<
    Order,
    "batch_id" | "status" | "total" | "subtotal_food"
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
    .select("status")
    .neq("status", "refunded");
  const { data: payouts } = await db()
    .from("promoter_payouts")
    .select("id, promoter_code, amount, note, paid_at, confirmed_at")
    .order("paid_at", { ascending: false });

  // Only a paid order earns: an unpaid one never travelled.
  const count = (orders ?? []).filter((o) => o.status !== "pending").length;

  return ((promoters ?? []) as Promoter[]).map((p) => {
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
  const { data } = await db()
    .from("batches")
    .select("fuel_cost, driver_cost, other_cost")
    .eq("stage", "handed_out")
    .order("run_date", { ascending: false })
    .limit(6);

  const runs = (data ?? [])
    .map((row) => (row.fuel_cost ?? 0) + (row.driver_cost ?? 0) + (row.other_cost ?? 0))
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
      .neq("status", "refunded");

    const orders = rows ?? [];
    if (orders.length === 0) continue;

    const paid = orders.filter((one) => one.status !== "pending");
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
