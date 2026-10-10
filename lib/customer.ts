import { db } from "./supabase";
import { commissionFor, overMenu } from "./admin";
import { orderFeed, type FeedOrder } from "./admin-data";
import { isGone, isPaid, NOT_ORDERS_SQL } from "./orders";
import { errandsBy } from "./other-money";
import type { Batch, Order } from "./types";

/**
 * One person, and everything the shop knows about them.
 *
 * The customer book answers "who orders from us". It cannot answer "is this
 * person worth a phone call", because that needs their orders, what they
 * cost us, and what the rest of the shop looks like beside them. That is
 * this page, and it is read before a run rather than at the end of a month.
 */

/**
 * What a person is worth, after their food and their share of the cars.
 *
 * Every part of this is a real figure except the last: run costs belong to
 * a run, not to a person, so fuel is split between the orders on that run in
 * proportion to what each one paid. Somebody who spent ten thousand on a run
 * that took thirty thousand carries a third of the fuel. There is no truer
 * way to do it without asking the driver which block he went to first, so
 * the page says the number is an estimate wherever this applied.
 */
export type CustomerProfit = {
  /** Money in, less what the food was worth at menu prices. */
  margin: number;
  /** Their share of what the counters really charged above the menu. */
  overMenu: number;
  /** Earned by whoever brought them, on their orders. */
  commission: number;
  /** Their share of fuel, driver and transport on the runs they were on. */
  runShare: number;
  profit: number;
  /** True where any run cost was apportioned, which is nearly always. */
  estimated: boolean;
};

export type OneCustomer = {
  phone: string;
  name: string;
  hostel: string;
  pin: string;
  note: string;
  callsThem: string;
  pays: "transfer" | "card";
  promoterCode: string | null;
  reviewed: boolean;
  /** The day of their first order, as the database recorded it. */
  since: string | null;
  /** Everything they have ordered, newest first, the written-off left out. */
  orders: FeedOrder[];
  /** Paid orders, and what they came to. */
  paidOrders: number;
  spend: number;
  refunded: number;
  averageOrder: number;
  /** What an order is worth across the whole shop, to read theirs against. */
  houseAverage: number;
  profit: CustomerProfit;
  /** Where they order from, most often first. */
  favourites: { name: string; count: number }[];
  /** The block and the time of day nearly all their orders use. Empty where
   *  they move around. */
  usualHostel: string;
  usualSlot: Batch["slot"] | "";
  /** Stars they have given, where they have rated anything. */
  rating: number | null;
  /** Errands with no order behind them. */
  errands: { took: number; count: number } | null;
  /** How many people their promoter has brought in altogether, which is what
   *  a commission should be read against. */
  broughtByThem: number;
};

/** The most common string in a list, where it is most of the list. */
function usually<T extends string>(all: T[]): T | "" {
  const said = all.filter(Boolean);
  if (said.length === 0) return "";
  const tally = new Map<T, number>();
  for (const one of said) tally.set(one, (tally.get(one) ?? 0) + 1);
  const [top] = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  // Two blocks out of three is a habit. Half and half is not.
  return top[1] >= said.length * 2 / 3 ? top[0] : "";
}

/**
 * Everything on one customer, or null where that number is not in the book.
 */
export async function oneCustomer(phone: string): Promise<OneCustomer | null> {
  const wanted = phone.trim();
  if (wanted === "") return null;

  // Named columns with a retry, so a database that has not had the newest
  // migration run on it still opens the page rather than 500ing on it.
  const full = await db()
    .from("customers")
    .select(
      "phone, name, hostel, pin, admin_note, payment_method, promoter_code, calls_them, reviewed_at, first_order_at"
    )
    .eq("phone", wanted)
    .maybeSingle();

  const { data: row } = full.error
    ? await db()
        .from("customers")
        .select("phone, name, hostel, pin, admin_note, promoter_code")
        .eq("phone", wanted)
        .maybeSingle()
    : full;
  if (!row) return null;

  const said = row as Record<string, unknown>;

  // The feed searches on the number, which also finds somebody whose number
  // merely contains it, so it is narrowed by hand afterwards.
  const theirs = (await orderFeed({ status: "all", search: wanted, limit: 500 })).filter(
    (order) => order.customer_phone === wanted && !isGone(order.status)
  );

  const paid = theirs.filter((order) => isPaid(order.status));
  const spend = paid.reduce((total, order) => total + order.total, 0);
  const foodAtMenu = paid.reduce((total, order) => total + (order.subtotal_food ?? 0), 0);

  // What an order is worth across the shop. Asked as two columns rather than
  // through the order feed, which carries lines and runs and would read the
  // whole shop to work out one average.
  const { data: everyOrder } = await db()
    .from("orders")
    .select("total, status")
    .not("status", "in", NOT_ORDERS_SQL);
  const housePaid = ((everyOrder ?? []) as { total: number; status: string }[]).filter((one) =>
    isPaid(one.status)
  );
  const houseAverage =
    housePaid.length === 0
      ? 0
      : Math.round(housePaid.reduce((total, one) => total + Number(one.total ?? 0), 0) / housePaid.length);

  const profit = await shareOfProfit(paid, foodAtMenu, spend);

  // Where they order from. Once per order rather than once per line, so a
  // person who buys four things from one kitchen has been there once.
  const places = new Map<string, number>();
  for (const order of theirs) {
    for (const where of new Set(order.lines.map((line) => line.restaurant).filter(Boolean))) {
      places.set(where, (places.get(where) ?? 0) + 1);
    }
  }

  const rated = theirs.map((order) => Number(order.rating ?? 0)).filter((stars) => stars > 0);

  const errands = (await errandsBy([wanted])).get(wanted) ?? null;

  const code = ((said.promoter_code as string | null) ?? "").trim();
  const broughtByThem = code === "" ? 0 : await howManyBrought(code);

  return {
    phone: wanted,
    name: (said.name as string) ?? "",
    hostel: (said.hostel as string) ?? "",
    pin: (said.pin as string) ?? "",
    note: (said.admin_note as string) ?? "",
    callsThem: (said.calls_them as string) ?? "",
    pays: said.payment_method === "card" ? "card" : "transfer",
    promoterCode: code === "" ? null : code,
    reviewed: Boolean(said.reviewed_at),
    since: (said.first_order_at as string | null) ?? theirs.at(-1)?.created_at ?? null,
    orders: theirs,
    paidOrders: paid.length,
    spend,
    refunded: theirs.filter((order) => order.status === "refunded").length,
    averageOrder: paid.length === 0 ? 0 : Math.round(spend / paid.length),
    houseAverage,
    profit,
    favourites: [...places.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    usualHostel: usually(theirs.map((order) => order.hostel)),
    usualSlot: usually(theirs.map((order) => String(order.slot ?? ""))) as Batch["slot"] | "",
    rating: rated.length === 0 ? null : rated.reduce((a, b) => a + b, 0) / rated.length,
    errands,
    broughtByThem,
  };
}

/** How many people in the book arrived on one promoter's link. */
async function howManyBrought(code: string): Promise<number> {
  try {
    const { count } = await db()
      .from("customers")
      .select("phone", { count: "exact", head: true })
      .eq("promoter_code", code);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * What one person's orders left after the food, the promoter and the cars.
 *
 * The same four sums the profit page uses, narrowed to their orders, with
 * each run's costs split between the orders on it by what they paid.
 *
 * Exported because one order wants the same split: the order's own page says
 * what it made, and working that out a second way there is how two pages
 * come to print two different profits for the same food.
 */
export async function shareOfProfit(
  paid: FeedOrder[],
  foodAtMenu: number,
  spend: number
): Promise<CustomerProfit> {
  const bare: CustomerProfit = {
    margin: spend - foodAtMenu,
    overMenu: 0,
    commission: 0,
    runShare: 0,
    profit: spend - foodAtMenu,
    estimated: false,
  };
  if (paid.length === 0) return { ...bare, margin: 0, profit: 0 };

  const ids = [...new Set(paid.map((order) => order.batch_id).filter(Boolean))] as string[];
  const commission = (await commissionFor(paid)).total;
  if (ids.length === 0) {
    return { ...bare, commission, profit: bare.margin - commission };
  }

  const [{ data: batchRows }, { data: mateRows }] = await Promise.all([
    db().from("batches").select("*").in("id", ids),
    db()
      .from("orders")
      .select("id, batch_id, status, total, subtotal_food, customer_phone, box_id")
      .in("batch_id", ids)
      .not("status", "in", NOT_ORDERS_SQL),
  ]);

  const batches = (batchRows ?? []) as unknown as Batch[];
  const mates = ((mateRows ?? []) as unknown as Order[]).filter((one) => isPaid(one.status));

  const over = await overMenu(batches, mates);

  let runShare = 0;
  let overShare = 0;
  let estimated = false;

  for (const batch of batches) {
    const onThisRun = mates.filter((one) => one.batch_id === batch.id);
    const runTotal = onThisRun.reduce((total, one) => total + Number(one.total ?? 0), 0);
    const runFood = onThisRun.reduce((total, one) => total + Number(one.subtotal_food ?? 0), 0);

    const mine = paid.filter((order) => order.batch_id === batch.id);
    const myTotal = mine.reduce((total, order) => total + order.total, 0);
    const myFood = mine.reduce((total, order) => total + (order.subtotal_food ?? 0), 0);

    const costs =
      Number(batch.fuel_cost ?? 0) +
      Number(batch.driver_cost ?? 0) +
      Number(batch.transport_cost ?? 0) +
      Number(batch.other_cost ?? 0);

    if (costs > 0 && runTotal > 0) {
      runShare += costs * (myTotal / runTotal);
      // Only a run they shared with somebody else was apportioned. A run
      // that was theirs alone carried all of its own fuel, which is a fact
      // rather than a guess.
      if (onThisRun.length > mine.length) estimated = true;
    }

    const spent = over.get(batch.id) ?? 0;
    if (spent !== 0 && runFood > 0) {
      overShare += spent * (myFood / runFood);
      if (onThisRun.length > mine.length) estimated = true;
    }
  }

  const margin = spend - foodAtMenu;
  return {
    margin,
    overMenu: Math.round(overShare),
    commission,
    runShare: Math.round(runShare),
    profit: Math.round(margin - overShare - commission - runShare),
    estimated,
  };
}
