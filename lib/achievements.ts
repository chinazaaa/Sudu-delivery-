import { db } from "./supabase";
import { profitBetween } from "./profit";
import { lagosToday } from "./time";

/**
 * What the shop has done so far, as a board of things to beat.
 *
 * Every figure here is read from the orders themselves rather than kept in
 * a table of its own. A score that is stored has to be updated by whatever
 * changes it, and the first refund that forgets to leaves a badge standing
 * for money the shop gave back. Counted fresh, it cannot lie.
 *
 * Tiered on purpose. One badge at a million naira is a badge nobody sees
 * for two years; the same goal with a hundred thousand and half a million
 * under it is three, and the one after the one you just got is the only
 * part anybody reads.
 */

/** How a number is said: naira, or a plain count. */
export type Unit = "money" | "count" | "rating";

export type Badge = {
  id: string;
  /** The family it belongs to, so tiers of one thing sit together. */
  group: string;
  name: string;
  /** What it took, in the shop's own words. */
  what: string;
  goal: number;
  got: number;
  unit: Unit;
};

export type Board = {
  badges: Badge[];
  earned: number;
  /** The next one to fall, by how close it is. Null when they are all got. */
  next: Badge | null;
};

/** Where the shop started. Earlier than any order, and that is the point. */
const DAY_ONE = "2018-01-01";

type Tally = {
  gross: number;
  profit: number;
  delivered: number;
  runs: number;
  customers: number;
  reviews: number;
  fiveStars: number;
  rating: number;
  repeat: number;
  boxes: number;
  kitchens: number;
};

async function count(
  table: string,
  shape: (query: any) => any = (one) => one
): Promise<number> {
  const { count: many } = await shape(
    db().from(table).select("id", { count: "exact", head: true })
  );
  return Number(many ?? 0);
}

/**
 * Everything the board needs, in as few questions as it takes.
 *
 * profitBetween already walks every run and every order on it, so the money
 * and the orders come from one call rather than three more of their own.
 */
async function tally(): Promise<Tally> {
  const [money, customers, kitchens, boxes, rated, repeat] = await Promise.all([
    profitBetween(DAY_ONE, lagosToday()),
    count("customers"),
    count("restaurants", (one) => one.eq("active", true)),
    count("orders", (one) => one.not("box_id", "is", null)),
    db()
      .from("orders")
      .select("rating")
      .not("rating", "is", null)
      .limit(2000)
      .then(
        (answer) => (answer.data ?? []) as { rating: number }[],
        () => [] as { rating: number }[]
      ),
    // Somebody who came back is the one number that says whether any of
    // this is working. Counted per phone, in one read.
    db()
      .from("orders")
      .select("customer_phone, status")
      .limit(5000)
      .then(
        (answer) => (answer.data ?? []) as { customer_phone: string; status: string }[],
        () => [] as { customer_phone: string; status: string }[]
      ),
  ]);

  const times = new Map<string, number>();
  for (const row of repeat) {
    if (row.status === "cancelled") continue;
    times.set(row.customer_phone, (times.get(row.customer_phone) ?? 0) + 1);
  }

  const delivered = await count("orders", (one) => one.eq("status", "delivered"));
  const runs = await count("batches", (one) => one.eq("status", "closed"));

  return {
    gross: Math.max(0, money.gross),
    profit: Math.max(0, money.profit),
    delivered,
    runs,
    customers,
    reviews: rated.length,
    fiveStars: rated.filter((one) => one.rating === 5).length,
    rating:
      rated.length === 0
        ? 0
        : Math.round((rated.reduce((sum, one) => sum + one.rating, 0) / rated.length) * 10) / 10,
    repeat: [...times.values()].filter((many) => many > 1).length,
    boxes,
    kitchens,
  };
}

/**
 * The board.
 *
 * Earned first, because the point of a board is what is on it; the locked
 * ones follow in the order they will fall, so the top of that half is the
 * one worth chasing this month.
 */
export async function board(): Promise<Board> {
  const now = await tally();

  const badges: Badge[] = [
    // Money in. The one anybody checks first.
    tier("took", "Money through the door", now.gross, "money", [
      [1, "Open for business", "The first naira anybody paid you"],
      [100_000, "A hundred thousand", "₦100,000 taken, all in"],
      [500_000, "Half a million", "₦500,000 taken"],
      [1_000_000, "A million", "₦1,000,000 through the shop"],
      [5_000_000, "Five million", "₦5,000,000 taken"],
    ]),
    // What was left afterwards, which is the harder number and the real one.
    tier("kept", "Profit", now.profit, "money", [
      [10_000, "In the black", "₦10,000 kept after the food and the car"],
      [100_000, "A hundred thousand kept", "₦100,000 of profit"],
      [500_000, "Half a million kept", "₦500,000 of profit"],
      [1_000_000, "A million kept", "₦1,000,000 of profit"],
    ]),
    tier("bags", "Deliveries", now.delivered, "count", [
      [1, "First bag", "One order handed over"],
      [50, "Fifty bags", "50 orders delivered"],
      [250, "Two hundred and fifty", "250 orders delivered"],
      [1_000, "A thousand bags", "1,000 orders delivered"],
    ]),
    tier("runs", "Runs", now.runs, "count", [
      [1, "First run", "One run closed and delivered"],
      [25, "Twenty five runs", "25 runs out and back"],
      [100, "A hundred runs", "100 runs"],
      [500, "Five hundred runs", "500 runs"],
    ]),
    tier("people", "Customers", now.customers, "count", [
      [1, "Somebody ordered", "The first person who trusted you with money"],
      [25, "Twenty five people", "25 customers on the books"],
      [100, "A hundred people", "100 customers"],
      [500, "Five hundred people", "500 customers"],
    ]),
    tier("again", "People who came back", now.repeat, "count", [
      [1, "They came back", "Somebody ordered a second time"],
      [25, "Twenty five regulars", "25 people have ordered more than once"],
      [100, "A hundred regulars", "100 people have ordered more than once"],
    ]),
    tier("stars", "Five star reviews", now.fiveStars, "count", [
      [1, "First five stars", "Somebody gave you full marks"],
      [10, "Ten five stars", "10 full marks"],
      [50, "Fifty five stars", "50 full marks"],
    ]),
    tier("boxes", "Boxes sold", now.boxes, "count", [
      [1, "First box", "Somebody bought a box you packed"],
      [25, "Twenty five boxes", "25 boxes sold"],
      [100, "A hundred boxes", "100 boxes sold"],
    ]),
    tier("kitchens", "Kitchens on the menu", now.kitchens, "count", [
      [5, "Five kitchens", "5 places on the menu at once"],
      [10, "Ten kitchens", "10 places on the menu"],
      [20, "Twenty kitchens", "20 places on the menu"],
    ]),
  ].flat();

  // Earned first, then the closest one to falling. A board sorted by goal
  // puts a million naira above a badge you will get on Thursday.
  const done = (one: Badge) => one.got >= one.goal;
  const sorted = [...badges].sort((a, b) => {
    if (done(a) !== done(b)) return done(a) ? -1 : 1;
    if (done(a)) return b.goal - a.goal;
    return b.got / b.goal - a.got / a.goal;
  });

  return {
    badges: sorted,
    earned: badges.filter(done).length,
    next: sorted.find((one) => !done(one)) ?? null,
  };
}

/** One family of badges, all measuring the same thing at rising goals. */
function tier(
  id: string,
  group: string,
  got: number,
  unit: Unit,
  steps: [number, string, string][]
): Badge[] {
  return steps.map(([goal, name, what]) => ({
    id: `${id}-${goal}`,
    group,
    name,
    what,
    goal,
    got,
    unit,
  }));
}
