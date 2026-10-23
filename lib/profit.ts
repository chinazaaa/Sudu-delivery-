import { db } from "./supabase";
import { isPaid, linesFor, NOT_ORDERS_SQL } from "./orders";
import { otherMoneyTotals, type OtherMoney } from "./other-money";
// The same two sums the dashboard and the run list use. This page had its
// own copies, and they drifted: food nobody typed into a sheet was counted
// as having cost nothing, so a half-reconciled run read as a large saving
// and this page claimed a profit the dashboard never agreed with.
import { chargedByRestaurant, commissionByRun, counterCosts, overMenu } from "./admin";
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
  /**
   * Everything the shop earned in the window, as one figure.
   *
   * The card used to show money in, the delivery margin and the costs, and
   * invite the obvious subtraction, which came out wrong by tens of
   * thousands. Two things were missing from it: the counter reconciliation,
   * which is a saving as often as it is an overspend, and the errands and
   * sales that have no run behind them.
   *
   * So this is the figure the costs actually come off: the delivery margin,
   * less whatever the counters charged above the menu (or plus whatever they
   * charged below it), plus what came in from work that was not an order.
   * Earned less costs is the profit, exactly, which is the one thing the
   * card has to be able to say.
   */
  earned: number;
  /** Earned by promoters on those orders. Owed whether or not it is paid. */
  commission: number;
  /** Fuel, driver, transport and anything else on those runs. */
  runCosts: number;
  /** Errands and sales with no run behind them. */
  otherIn: number;
  otherOut: number;
  /** Everything taken off. */
  profit: number;
  /**
   * The same, counting only the runs whose costs are actually in.
   *
   * A run that is still open, or one that went out last night and has had
   * nothing typed into it, has takings and no car to pay for, so it lands
   * on the profit at full value and then falls by twenty thousand the
   * afternoon somebody enters the fuel. Watching a figure you have been
   * told is the profit drop every time you do the bookkeeping teaches you
   * not to trust it.
   *
   * So the headline is the settled part, and what is waiting is said
   * beside it rather than folded into it. Nothing is hidden: the working
   * underneath still adds up to `profit`, and a run joins this the moment
   * its costs are entered.
   *
   * Money that was never on a run, the errands and the sales, is settled
   * the moment it is written down: there is no car coming for it.
   */
  settled: number;
  /** Runs still waiting for somebody to type what the car cost. */
  waitingRuns: number;
  /** What those runs have taken, before any of it pays for a car. Not
   *  profit, and never called it: it is the figure that will fall. */
  waitingBeforeCosts: number;
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
/**
 * Whether a run's profit is still a guess.
 *
 * Only a run that took money can be guessing. A run nobody ordered on has
 * no takings, no car, nothing to pay and nothing to estimate: its profit
 * is zero whether or not anybody ever types a cost into it, and putting it
 * on a list of things to go and fix is asking somebody to do work that
 * does not exist.
 *
 * Settled closes it too, whatever the costs say. A run can finish owing
 * nothing: a free delivery, a car somebody lent, an evening where the only
 * order was walked across campus. Reading zero costs as "not told yet"
 * parks those in waiting for ever, and the only way to get them out is to
 * type a cost that was never paid.
 *
 * This went wrong because the rule was written as "no costs entered", and
 * a scheduled run opens itself every week whether or not anybody wants it.
 * The result was twenty three runs on the profit page demanding real fuel
 * figures, several of them from before the shop had launched and nineteen
 * of them already settled. The board had always asked the whole question;
 * the profit page asked a shorter one, and this is the two of them
 * agreeing in one place instead of disagreeing in two.
 */
export function stillAGuess(
  paidOrders: number,
  costsEntered: number,
  settledAt: string | null = null
): boolean {
  if (settledAt !== null) return false;
  return paidOrders > 0 && costsEntered === 0;
}

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
    earned: 0,
    settled: 0,
    waitingRuns: 0,
    waitingBeforeCosts: 0,
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
  // What came in, and what went out, kept as two figures that subtract.
  // `made` nets the other money off against itself, so it is taken apart
  // again here: the takings join what was earned and the spending joins
  // what was paid, and the profit is identical either way.
  const earned = margin - over + totals.took;
  const profit = earned - (commission + runCosts + totals.spent);

  /*
   * Only the runs that happened.
   *
   * A run with no paid order on it did not happen: nobody can drive to a
   * counter for nothing, so there was no car, no fuel and no evening. A
   * scheduled run opens itself every week regardless, so the window is
   * full of dates that were offered and not taken, and listing them run by
   * run is a table of nights that never were.
   *
   * Kept when it carries a cost, whatever its orders say. That is a run
   * that did go out and whose takings have since been refunded away, and
   * money that was really spent must not vanish from the working because
   * the orders behind it were undone.
   */
  const happened = batches.filter((one) => {
    const id = String(one.id);
    const carried =
      Number(one.fuel_cost ?? 0) +
      Number(one.driver_cost ?? 0) +
      Number(one.transport_cost ?? 0) +
      Number(one.other_cost ?? 0);
    return carried > 0 || paid.some((order) => String(order.batch_id) === id);
  });

  // Newest first: the run somebody is asking about is nearly always the
  // last one, and a window can be a year long.
  const byRun: RunLine[] = happened
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
        estimated: stillAGuess(mine.length, carried, one.settled_at as string | null),
        profit: Math.round(took - menu - beyond - owed - carried),
      };
    })
    .sort((a, b) => b.runDate.localeCompare(a.runDate));

  /*
   * Settled, and waiting.
   *
   * Taken off `byRun`, which has already done the per run arithmetic, so
   * the two figures cannot drift from the table underneath them. The
   * errands sit in the settled half because nothing is still to come off
   * them.
   */
  const waiting = byRun.filter((run) => run.estimated);
  const settled =
    byRun
      .filter((run) => !run.estimated)
      .reduce((sum, run) => sum + run.profit, 0) +
    totals.took -
    totals.spent;

  return {
    from,
    to,
    orders: paid.length,
    gross,
    foodAtMenu,
    overMenu: over,
    margin,
    earned,
    commission,
    runCosts,
    otherIn: totals.took,
    otherOut: totals.spent,
    profit,
    settled,
    waitingRuns: waiting.length,
    waitingBeforeCosts: waiting.reduce((sum, run) => sum + run.profit, 0),
    runs: happened.length,
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
    // The same two halves as a window with runs in it, so the card's
    // subtraction holds here too: an errand's takings are earned and its
    // spending is a cost.
    earned: totals.took,
    profit: totals.made,
    // Nothing here is waiting on a car, so all of it is settled.
    settled: totals.made,
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
  // What these things really cost, where somebody has written it down off a
  // board or a receipt, so this page and the run's own sheet reckon the
  // same food the same way.
  const atCounter = await counterCosts(lines.map((line) => line.menu_item_id));

  const rows: KitchenRunRow[] = reconciled.flatMap((id) =>
    chargedByRestaurant(
      lines.filter((line) => runOfOrder.get(line.order_id) === id),
      spend.filter((row) => String(row.batch_id) === id),
      {},
      atCounter
    ).map((place) => ({
      restaurant: place.restaurant,
      batchId: id,
      menu: place.menu,
      charged: place.charged,
    }))
  );

  return { from, to, runs: reconciled.length, kitchens: kitchenTotals(rows) };
}

/** One run's profit, and what it took, for splitting across its orders. */
export type RunShare = { profit: number; took: number; estimated: boolean };

/**
 * Each run's profit, by run, for anything that needs a share of it.
 *
 * Profit is a fact about a run rather than about an order: one car, one
 * tank of fuel, one driver, shared by everything on it. Anybody asking
 * what a customer or a channel was worth is really asking for a slice of
 * these, so the arithmetic lives once, here, and is the same arithmetic
 * the profit page shows for that run. Two copies of it would be two
 * answers to the same question.
 *
 * The whole of every run is read, including orders outside whatever window
 * the caller cares about, because a share of a run means nothing without
 * the rest of it.
 */
export async function runProfitShares(ids: string[]): Promise<Map<string, RunShare>> {
  const runs = new Map<string, RunShare>();
  if (ids.length === 0) return runs;

  const [{ data: batchRows }, { data: mateRows }] = await Promise.all([
    db().from("batches").select("*").in("id", ids),
    db()
      .from("orders")
      .select("id, batch_id, status, total, subtotal_food, customer_phone, box_id")
      .in("batch_id", ids)
      .not("status", "in", NOT_ORDERS_SQL),
  ]);

  const batches = (batchRows ?? []) as Record<string, unknown>[];
  const everyone = (mateRows ?? []) as unknown as Order[];
  const paidOnThem = everyone.filter((one) => isPaid(one.status));

  const [overByRun, owedByRun] = await Promise.all([
    overMenu(batches as unknown as Batch[], everyone),
    commissionByRun(paidOnThem),
  ]);

  for (const one of batches) {
    const id = String(one.id);
    const onIt = paidOnThem.filter((order) => String(order.batch_id) === id);
    const took = money(onIt as unknown as Record<string, unknown>[], "total");
    const menu = money(onIt as unknown as Record<string, unknown>[], "subtotal_food");
    const carried =
      Number(one.fuel_cost ?? 0) +
      Number(one.driver_cost ?? 0) +
      Number(one.transport_cost ?? 0) +
      Number(one.other_cost ?? 0);
    runs.set(id, {
      profit: took - menu - (overByRun.get(id) ?? 0) - (owedByRun.get(id) ?? 0) - carried,
      took,
      estimated: stillAGuess(onIt.length, carried, one.settled_at as string | null),
    });
  }
  return runs;
}

/** What a channel's orders were worth after everything came off them. */
export type ChannelProfit = { profit: number; estimated: boolean };

/**
 * Profit, split by where the customer came from.
 *
 * The analytics table could say ChatGPT brought two orders and what they
 * came to, and stopped there. Money in is the easy half: a channel that
 * brings big orders onto half-empty cars is worth less than one that fills
 * a run somebody was driving anyway, and revenue cannot tell those apart.
 *
 * It is an apportionment, not a measurement, and worth knowing which.
 * Profit is a fact about a run: one car, one tank of fuel, one driver,
 * shared by everything on it. So each run's profit is split across the
 * orders on it in proportion to what each was worth, and each order's
 * share is counted to whatever channel brought it. The same method the
 * customer page already uses for one person's share, for the same reason:
 * the alternative is pretending a fifth of a car can be traced to a bag.
 *
 * The whole run is read even where only one of its orders is in the
 * window, because a share of a run means nothing without the rest of it.
 * A run whose costs nobody has typed in yet is flagged rather than
 * guessed at, exactly as the profit page flags it.
 */
export async function profitByChannel(
  days: number
): Promise<Record<string, ChannelProfit>> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // The same orders the table beside this one is counting.
  const { data: mineRows } = await db()
    .from("orders")
    .select("id, batch_id, status, total, came_from")
    .gte("created_at", since)
    .not("status", "in", NOT_ORDERS_SQL)
    .limit(20000);

  const mine = ((mineRows ?? []) as Record<string, unknown>[]).filter((one) =>
    isPaid(String(one.status ?? ""))
  );
  if (mine.length === 0) return {};

  const ids = [
    ...new Set(
      mine.map((one) => String(one.batch_id ?? "")).filter((id) => id !== "" && id !== "null")
    ),
  ];
  if (ids.length === 0) return {};

  const [{ data: batchRows }, { data: mateRows }] = await Promise.all([
    db().from("batches").select("*").in("id", ids),
    db()
      .from("orders")
      .select("id, batch_id, status, total, subtotal_food, customer_phone, box_id")
      .in("batch_id", ids)
      .not("status", "in", NOT_ORDERS_SQL),
  ]);

  const runs = await runProfitShares(ids);

  const out: Record<string, ChannelProfit> = {};
  for (const order of mine) {
    const run = runs.get(String(order.batch_id ?? ""));
    // An order on no run, or on one that took nothing, has no share of
    // anything to be given.
    if (!run || run.took <= 0) continue;

    const channel = String(order.came_from ?? "");
    const bag = out[channel] ?? { profit: 0, estimated: false };
    bag.profit += run.profit * (Number(order.total ?? 0) / run.took);
    if (run.estimated) bag.estimated = true;
    out[channel] = bag;
  }

  for (const channel of Object.keys(out)) {
    out[channel].profit = Math.round(out[channel].profit);
  }
  return out;
}
