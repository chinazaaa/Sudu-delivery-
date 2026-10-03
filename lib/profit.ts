import { db } from "./supabase";
import { isPaid, NOT_ORDERS_SQL } from "./orders";
import { otherMoneyTotals, type OtherMoney } from "./other-money";

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
    .select("id, batch_id, status, total, subtotal_food, customer_phone")
    .in("batch_id", ids)
    .not("status", "in", NOT_ORDERS_SQL);

  const orders = (orderRows ?? []) as {
    id: string;
    batch_id: string;
    status: string;
    total: number;
    subtotal_food: number;
    customer_phone: string;
  }[];
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

  const [overMenu, commission, aside] = await Promise.all([
    reallyPaid(ids, paid),
    owedOn(paid),
    asideBetween(from, to),
  ]);

  const totals = otherMoneyTotals(aside);
  const margin = gross - foodAtMenu;
  const profit = margin - overMenu - commission - runCosts + totals.made;

  return {
    from,
    to,
    orders: paid.length,
    gross,
    foodAtMenu,
    overMenu,
    margin,
    commission,
    runCosts,
    otherIn: totals.took,
    otherOut: totals.spent,
    profit,
    runs: batches.length,
    aside,
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
 * What the counters really charged above the menu, across these runs.
 *
 * Only runs somebody has reconciled are looked at; the rest are at the menu
 * price by definition. Negative is a saving, which is the usual case.
 */
async function reallyPaid(
  batchIds: string[],
  paid: { batch_id: string; subtotal_food: number }[]
): Promise<number> {
  try {
    const { data } = await db()
      .from("counter_spend")
      .select("batch_id, paid")
      .in("batch_id", batchIds);

    const spend = (data ?? []) as { batch_id: string; paid: number }[];
    if (spend.length === 0) return 0;

    const byRun = new Map<string, number>();
    for (const row of spend) {
      byRun.set(row.batch_id, (byRun.get(row.batch_id) ?? 0) + Number(row.paid ?? 0));
    }

    let over = 0;
    for (const [runId, reallyPaidHere] of byRun) {
      const atMenu = paid
        .filter((one) => one.batch_id === runId)
        .reduce((sum, one) => sum + one.subtotal_food, 0);
      // A run with nothing paid on it has no menu figure to compare against.
      if (atMenu > 0) over += reallyPaidHere - atMenu;
    }
    return over;
  } catch {
    return 0;
  }
}

/**
 * Promoter commission earned on these orders.
 *
 * A promoter is bound to a customer's number rather than to an order, so it
 * is the number that decides, and a box pays its own rate where the shop has
 * set one.
 */
async function owedOn(
  paid: { customer_phone: string }[]
): Promise<number> {
  if (paid.length === 0) return 0;
  try {
    const phones = [...new Set(paid.map((one) => one.customer_phone))];
    const [{ data: customers }, { data: promoters }] = await Promise.all([
      db().from("customers").select("phone, promoter_code").in("phone", phones),
      db().from("promoters").select("code, rate"),
    ]);

    const broughtBy = new Map(
      ((customers ?? []) as { phone: string; promoter_code?: string | null }[]).map(
        (one) => [one.phone, (one.promoter_code ?? "").trim()]
      )
    );
    const rates = new Map(
      ((promoters ?? []) as { code: string; rate: number }[]).map((one) => [
        one.code,
        Number(one.rate ?? 0),
      ])
    );

    return paid.reduce((sum, order) => {
      const code = broughtBy.get(order.customer_phone) ?? "";
      return sum + (code ? rates.get(code) ?? 0 : 0);
    }, 0);
  } catch {
    return 0;
  }
}
