import { db } from "./supabase";
import { isPaid, linesFor, NOT_ORDERS_SQL } from "./orders";
import { otherMoneyTotals, type OtherMoney } from "./other-money";
// The same two sums the dashboard and the run list use. This page had its
// own copies, and they drifted: food nobody typed into a sheet was counted
// as having cost nothing, so a half-reconciled run read as a large saving
// and this page claimed a profit the dashboard never agreed with.
import { chargedByRestaurant, commissionByRun, overMenu } from "./admin";
import type { Batch, Order } from "./types";

/**
 * What the shop made between two days, and where every naira of it went.
 *
 * The dashboard answers this with one figure over a fixed four weeks, which
 * is the right question for a morning and the wrong one for a month end. The
 * same sums, over a window somebody picks, with the working shown: a number
 * you cannot take apart is a number you end up not believing.
 *
 * Everything here is counted by the day the work happened. An order belongs
 * to its run's date rather than the minute it was placed, because a Friday
 * order for Saturday's car is Saturday's trip and Saturday's fuel.
 */
export type Profit = {
  from: string;
  to: string;
  /** Paid orders, and what they came to. */
  orders: number;
  gross: number;
  /** What the food was worth at menu prices. */
  foodAtMenu: number;
  /** What the counters really charged, where a run has been reconciled.
   *  Negative is a saving: the shopping came in under the menu. */
  overMenu: number;
  /** Money in, less the food: the delivery margin. */
  margin: number;
  /** Earned by promoters on those orders. Owed whether or not it is paid. */
  commission: number;
  /** Fuel, driver, transport and anything else on those runs. */
  runCosts: number;
  /** Errands and sales with no run behind them. */
  otherIn: number;
  otherOut: number;
  /** Everything taken off. */
  profit: number;
  /** The runs the window covers, for the line that says so. */
  runs: number;
  /** Every line of other money in the window, newest first. */
  aside: OtherMoney[];
  /** One line per run in the window, newest first, so the figures above can
   *  be taken apart by the thing that caused them. */
  byRun: RunLine[];
};

/**
 * One run, and where its money went.
 *
 * Took, less what the counters charged, less what the car and the promoters
 * cost, is the profit on the line: the same arithmetic as the page's working,
 * at the size somebody can check against a run sheet.
 */
export type RunLine = {
  id: string;
  runDate: string;
  slot: Batch["slot"];
  kind: Batch["kind"];
  /** Paid orders on it, which is what the money is from. */
  orders: number;
  took: number;
  /** What the counters charged: the menu price, plus anything over it where
   *  the run has been reconciled. */
  food: number;
  /** What is left of the orders after the menu price of the food. */
  delivery: number;
  /** Fuel, driver, transport, and the commission earned on it. */
  costs: number;
  /** Nothing has been typed in for the car yet, so the profit on this line
   *  is the best case rather than the figure. */
  estimated: boolean;
  profit: number;
};

const money = (rows: { [key: string]: unknown }[], field: string): number =>
  rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0);

/**
 * Between two days, both included, as yyyy-mm-dd.
 */
export async function profitBetween(from: string, to: string): Promise<Profit> {
  const empty: Profit = {
    from,
    to,
    orders: 0,
    gross: 0,
    foodAtMenu: 0,
    overMenu: 0,
    margin: 0,
    commission: 0,
    runCosts: 0,
    otherIn: 0,
    otherOut: 0,
    profit: 0,
    runs: 0,
    aside: [],
    byRun: [],
  };

  const { data: batchRows } = await db()
    .from("batches")
    .select("*")
    .gte("run_date", from)
    .lte("run_date", to);
  const batches = (batchRows ?? []) as Record<string, any>[];
  if (batches.length === 0) return { ...empty, ...(await asideOnly(from, to)) };

  const ids = batches.map((one) => String(one.id));
  const { data: orderRows } = await db()
    .from("orders")
    .select("id, batch_id, status, total, subtotal_food, customer_phone, box_id")
    .in("batch_id", ids)
    .not("status", "in", NOT_ORDERS_SQL);

  const orders = (orderRows ?? []) as Pick<
    Order,
    | "id"
    | "batch_id"
    | "status"
    | "total"
    | "subtotal_food"
    | "customer_phone"
    | "box_id"
  >[];
  const paid = orders.filter((one) => isPaid(one.status));

  const gross = money(paid, "total");
  const foodAtMenu = money(paid, "subtotal_food");
  const runCosts = batches.reduce(
    (sum, one) =>
      sum +
      Number(one.fuel_cost ?? 0) +
      Number(one.driver_cost ?? 0) +
      Number(one.transport_cost ?? 0) +
      Number(one.other_cost ?? 0),
    0
  );

  const [overByRun, owedByRun, aside] = await Promise.all([
    overMenu(batches as unknown as Batch[], orders),
    commissionByRun(paid),
    asideBetween(from, to),
  ]);
  const over = [...overByRun.values()].reduce((sum, one) => sum + one, 0);
  const commission = [...owedByRun.values()].reduce((sum, one) => sum + one, 0);

  const totals = otherMoneyTotals(aside);
  const margin = gross - foodAtMenu;
  const profit = margin - over - commission - runCosts + totals.made;

  // Newest first: the run somebody is asking about is nearly always the
  // last one, and a window can be a year long.
  const byRun: RunLine[] = batches
    .map((one) => {
      const id = String(one.id);
      const mine = paid.filter((order) => String(order.batch_id) === id);
      const took = money(mine, "total");
      const menu = money(mine, "subtotal_food");
      const carried =
        Number(one.fuel_cost ?? 0) +
        Number(one.driver_cost ?? 0) +
        Number(one.transport_cost ?? 0) +
        Number(one.other_cost ?? 0);
      const owed = owedByRun.get(id) ?? 0;
      const beyond = overByRun.get(id) ?? 0;
      return {
        id,
        runDate: String(one.run_date),
        slot: one.slot as Batch["slot"],
        kind: one.kind as Batch["kind"],
        orders: mine.length,
        took,
        food: menu + beyond,
        delivery: took - menu,
        costs: carried + owed,
        estimated: carried === 0,
        profit: Math.round(took - menu - beyond - owed - carried),
      };
    })
    .sort((a, b) => b.runDate.localeCompare(a.runDate));

  return {
    from,
    to,
    orders: paid.length,
    gross,
    foodAtMenu,
    overMenu: over,
    margin,
    commission,
    runCosts,
    otherIn: totals.took,
    otherOut: totals.spent,
    profit,
    runs: batches.length,
    aside,
    byRun,
  };
}

/** A window with no runs in it can still have errands in it. */
async function asideOnly(from: string, to: string): Promise<Partial<Profit>> {
  const aside = await asideBetween(from, to);
  const totals = otherMoneyTotals(aside);
  return {
    aside,
    otherIn: totals.took,
    otherOut: totals.spent,
    profit: totals.made,
  };
}

async function asideBetween(from: string, to: string): Promise<OtherMoney[]> {
  try {
    const { data, error } = await db()
      .from("other_money")
      .select("*")
      .gte("happened_on", from)
      .lte("happened_on", to)
      .order("happened_on", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as OtherMoney[];
  } catch {
    return [];
  }
}

/**
 * What one kitchen kept over the window, on the runs that have been reconciled.
 *
 * Food only. The delivery fee is one fee per car, so it belongs to the run and
 * not to any one kitchen: splitting it between the five counters a car stops
 * at would need a rule nobody could check against anything, and a figure that
 * cannot be checked is a figure that gets argued about instead of used.
 */
export type KitchenLine = {
  restaurant: string;
  /** The menu value of its lines on paid orders: what went through it. */
  through: number;
  /** That menu value, less what the counters were really charged for those
   *  same lines. Negative when a counter charged above the menu. */
  kept: number;
  /** Kept as a percentage of what went through, which is what the panel
   *  sorts on: a small kitchen keeping a third of its own takings is the
   *  thing worth seeing, not the big one keeping a twentieth. */
  share: number;
  /** Reconciled runs it appeared on, so a figure built from one night can be
   *  told apart from one built from seven. */
  runs: number;
  /** What the counters charged above the menu. Negative is a saving. This is
   *  the same money as kept, said from the counter's side, which is the way
   *  the panel's own line says it. */
  over: number;
};

export type ByKitchen = {
  from: string;
  to: string;
  /** Reconciled runs the whole panel is built from, for the footnote that
   *  says so. Runs still on estimates are not in any figure here. */
  runs: number;
  kitchens: KitchenLine[];
};

/** One restaurant's share of one reconciled run, before the folding. */
type KitchenRunRow = {
  restaurant: string;
  batchId: string;
  menu: number;
  charged: number;
};

/**
 * Per-run, per-restaurant charges folded into one line per kitchen.
 *
 * Kept apart from the queries because this is the whole arithmetic of the
 * panel and the thing anybody would dispute, and a sum nobody can run on a
 * handful of made-up rows is a sum that gets believed rather than checked.
 *
 * Sorted by the percentage kept, highest first, the way the board prints it.
 * Ties fall to the larger kitchen, so the order does not shuffle between two
 * reads of the same window.
 */
export function kitchenTotals(rows: KitchenRunRow[]): KitchenLine[] {
  const bags = new Map<string, { through: number; charged: number; runs: Set<string> }>();

  for (const row of rows) {
    const bag = bags.get(row.restaurant) ?? { through: 0, charged: 0, runs: new Set<string>() };
    bag.through += row.menu;
    bag.charged += row.charged;
    bag.runs.add(row.batchId);
    bags.set(row.restaurant, bag);
  }

  return [...bags.entries()]
    .map(([restaurant, bag]) => {
      const kept = Math.round(bag.through - bag.charged);
      return {
        restaurant,
        through: Math.round(bag.through),
        kept,
        // A kitchen nothing went through has no percentage to show rather
        // than a hundred per cent of nothing.
        share: bag.through === 0 ? 0 : Math.round((kept / bag.through) * 100),
        runs: bag.runs.size,
        over: Math.round(bag.charged - bag.through),
      };
    })
    .sort((a, b) => (b.share === a.share ? b.through - a.through : b.share - a.share));
}

/**
 * What each kitchen kept between two days, and how much went through it.
 *
 * Only runs somebody has reconciled are in here, which means runs with lines
 * in counter_spend. A run with nothing typed into it is left out entirely
 * rather than counted at the menu price, because at the menu price every
 * kitchen keeps exactly nothing and a panel of zeroes reads as a fact about
 * the kitchens instead of a fact about the typing.
 */
export async function profitByKitchen(from: string, to: string): Promise<ByKitchen> {
  const empty: ByKitchen = { from, to, runs: 0, kitchens: [] };

  const { data: batchRows } = await db()
    .from("batches")
    .select("id")
    .gte("run_date", from)
    .lte("run_date", to);
  const ids = ((batchRows ?? []) as { id: string }[]).map((one) => String(one.id));
  if (ids.length === 0) return empty;

  // What was really handed over, per counter line. This is also what says a
  // run has been reconciled at all: no rows, no run.
  let spend: { batch_id: string; line_key: string; paid: number; recovered?: number | null }[] = [];
  try {
    const { data, error } = await db()
      .from("counter_spend")
      .select("batch_id, line_key, paid, recovered")
      .in("batch_id", ids);
    if (error) throw new Error(error.message);
    spend = (data ?? []) as typeof spend;
  } catch {
    return empty;
  }
  if (spend.length === 0) return empty;

  const reconciled = [...new Set(spend.map((row) => String(row.batch_id)))];

  const { data: orderRows } = await db()
    .from("orders")
    .select("id, batch_id, status")
    .in("batch_id", reconciled)
    .not("status", "in", NOT_ORDERS_SQL);
  const paid = ((orderRows ?? []) as Pick<Order, "id" | "batch_id" | "status">[]).filter(
    (one) => isPaid(one.status)
  );
  if (paid.length === 0) return { ...empty, runs: reconciled.length };

  const lines = await linesFor(paid.map((one) => one.id));
  const runOfOrder = new Map(paid.map((one) => [one.id, String(one.batch_id)]));

  // One run at a time, because a line key is only unique inside its own run:
  // the same bucket at the same price is a different purchase on a different
  // night, and pooling the keys would pay for one of them twice.
  const rows: KitchenRunRow[] = reconciled.flatMap((id) =>
    chargedByRestaurant(
      lines.filter((line) => runOfOrder.get(line.order_id) === id),
      spend.filter((row) => String(row.batch_id) === id)
    ).map((place) => ({
      restaurant: place.restaurant,
      batchId: id,
      menu: place.menu,
      charged: place.charged,
    }))
  );

  return { from, to, runs: reconciled.length, kitchens: kitchenTotals(rows) };
}
