import { db } from "./supabase";
import { isGone, isPaid } from "./orders";
import { profitBetween } from "./profit";
import { madeOn } from "./other-money";
import { lagosToday } from "./time";

/**
 * What the shop has done so far, as a board of things to beat.
 *
 * Nothing here is stored. A score kept in a table has to be updated by
 * everything that changes it, and the first refund that forgets leaves a
 * badge standing for money the shop gave back. Counted off the orders
 * themselves, it cannot lie.
 *
 * Which also gives the dates for free. A badge is earned at the moment the
 * running total crosses its goal, and that moment is simply the order,
 * review or run that took it over: the board replays the history and reads
 * the timestamp off whatever did it.
 *
 * Tiered on purpose. One badge at a million naira is a badge nobody sees
 * for two years; the same goal with a hundred thousand and half a million
 * under it is three, and the one after the one just earned is the only part
 * anybody reads.
 */

/** How a number is said: naira, or a plain count. */
export type Unit = "money" | "count";

/** One thing that happened, and what it added to a running total. */
type Happening = {
  /** When, as an instant, or as a yyyy-mm-dd day where that is all there is. */
  at: string;
  by: number;
  /** Whether `at` carries a real time of day or only a date. */
  exact: boolean;
};

export type Badge = {
  id: string;
  /** The family it belongs to, so tiers of one thing sit together. Kept
   *  short: it sits on the right of a card beside the badge's own name,
   *  and "Money through the door" took that whole line to itself. */
  group: string;
  name: string;
  /** What it took, in the shop's own words. */
  what: string;
  goal: number;
  got: number;
  unit: Unit;
  /** When it was earned, or empty while it is still locked. */
  when: string;
  /** False where the best the books hold is the day, not the minute. */
  exact: boolean;
  /** Measured by the biggest single one rather than by a running total, so
   *  the page can say "best so far" instead of "to go". */
  peak?: boolean;
};

export type Board = {
  badges: Badge[];
  earned: number;
  /** The next one to fall, by how close it is. Null when they are all got. */
  next: Badge | null;
};

/** Where the shop started. Earlier than any order, and that is the point. */
const DAY_ONE = "2018-01-01";

const by = (a: Happening, b: Happening) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);

/**
 * Everything that has happened, one stream per thing worth counting.
 *
 * Read in four questions rather than one per badge: the orders carry the
 * money, the bags, the boxes, the reviews and the regulars between them,
 * and profitBetween has already walked every run.
 */
async function history(): Promise<{
  streams: Record<string, Happening[]>;
  profit: number;
  /** How many blocks are on the list, so "every block" is a real goal. */
  blockCount: number;
}> {
  const [
    money,
    orderRows,
    customerRows,
    batchRows,
    kitchenRows,
    lineRows,
    itemRows,
    cartRows,
    hostelRows,
  ] = await Promise.all([
    profitBetween(DAY_ONE, lagosToday()),
    db()
      .from("orders")
      .select(
        "id, status, total, box_id, rating, rated_at, paid_at, done_at, created_at, customer_phone, batch_id, hostel, promoter_code, group_id"
      )
      .order("created_at")
      .limit(10_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("customers")
      .select("first_order_at, created_at")
      .limit(10_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("batches")
      .select("id, status, settled_at, run_date")
      .limit(10_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("restaurants")
      .select("created_at, active")
      .limit(1_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("order_items")
      .select("order_id, menu_item_id, qty, unit_price_at_order")
      .limit(50_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("menu_items")
      .select("id, restaurant_id")
      .limit(20_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("carts")
      .select("handled_at, handled_reason")
      .not("handled_at", "is", null)
      .limit(5_000)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    db()
      .from("hostels")
      .select("name", { count: "exact" })
      .eq("active", true)
      .limit(200)
      .then(
        (answer) => (answer.data ?? []) as Record<string, any>[],
        () => [] as Record<string, any>[]
      ),
    ]);

  // Refunded went back and cancelled never left, so neither is on this
  // board. isPaid is the shop's own rule for that, used here rather than a
  // list of statuses written out again: a third kind of gone should not
  // need finding in two places.
  const paid = orderRows.filter((row) => isPaid(String(row.status)));

  // Which runs actually carried a bag.
  const carried = new Set(paid.map((row) => String(row.batch_id)).filter(Boolean));

  // When a bag reached somebody. done_at where the handover was recorded;
  // where it was not, the run being settled is the closest the books come,
  // and that is an evening's work rather than a minute, so it is not called
  // exact. Falling back to paid_at would date "one order handed over" to
  // the minute the money arrived, hours before the car left.
  const handover = (row: Record<string, any>) => {
    const settled = settledOn.get(String(row.batch_id)) ?? "";
    return {
      at: String(row.done_at || settled || row.paid_at || row.created_at),
      exact: Boolean(row.done_at),
    };
  };

  // When each run was settled, which is the nearest thing the books hold to
  // when its bags were handed over.
  const settledOn = new Map<string, string>(
    batchRows
      .filter((row) => row.settled_at)
      .map((row) => [String(row.id), String(row.settled_at)])
  );

  // Somebody who came back is the one number that says whether any of this
  // is working, and the moment that counts is their second order, not their
  // first: the badge is earned when they return.
  // Two orders they actually paid for. A cart abandoned twice is not
  // somebody coming back, and a refund is the shop's money returning
  // rather than a customer's visit.
  const seen = new Map<string, number>();
  const again: Happening[] = [];
  const firstPaid: Happening[] = [];
  for (const row of paid) {
    const who = String(row.customer_phone);
    const many = (seen.get(who) ?? 0) + 1;
    seen.set(who, many);
    const at = String(row.paid_at || row.created_at);
    if (many === 1) firstPaid.push({ at, by: 1, exact: Boolean(row.paid_at) });
    if (many === 2) again.push({ at, by: 1, exact: Boolean(row.paid_at) });
  }

  // Profit is the one figure with no moment of its own. It is a run's
  // takings less what that run cost, settled days later, so the honest
  // answer is the day rather than the minute, and the board says so.
  const kept: Happening[] = [
    ...money.byRun.map((run) => ({ at: run.runDate, by: run.profit, exact: false })),
    // Takings less costs on the line, which is what every other page in
    // admin calls the money made on an errand. This read a "direction" and
    // an "amount", and the table has neither: every line came out as zero,
    // so a sold-on packet of pads was worth nothing to the board while the
    // dashboard counted it, and the two disagreed by exactly that much.
    ...money.aside.map((one) => ({
      at: String(one.happened_on ?? ""),
      by: madeOn(one),
      exact: false,
    })),
  ].filter((one) => one.at !== "");

  const delivered = orderRows.filter((row) => String(row.status) === "delivered");

  // Blocks. One badge is how much of the campus has been reached, the other
  // is how deep into any one block the shop has got, which is a different
  // question: a hundred bags spread one to a block is not a hostel that
  // orders from you.
  const reached = new Set<string>();
  const blocks: Happening[] = [];
  const deepest = new Map<string, number>();
  const oneBlock: Happening[] = [];
  for (const row of [...delivered].sort((a, b) =>
    String(a.created_at) < String(b.created_at) ? -1 : 1
  )) {
    const block = String(row.hostel ?? "").trim();
    if (block === "") continue;
    const when = handover(row);
    if (!reached.has(block)) {
      reached.add(block);
      blocks.push({ ...when, by: 1 });
    }
    const many = (deepest.get(block) ?? 0) + 1;
    deepest.set(block, many);
    // The size here is "this block has now had this many", so the biggest
    // one is the block that orders most and the first to pass a goal is
    // when that goal was met.
    oneBlock.push({ ...when, by: many });
  }

  // Orders a promoter's link brought in, and how many promoters have
  // brought one. Two different things: nine people with a code and nothing
  // through any of them is not a promoter programme, and only the second
  // badge can tell you that.
  const earning = new Set<string>();
  const referred: Happening[] = [];
  const earners: Happening[] = [];
  for (const row of [...paid].sort((a, b) =>
    String(a.paid_at || a.created_at) < String(b.paid_at || b.created_at) ? -1 : 1
  )) {
    const code = String(row.promoter_code ?? "").trim();
    if (code === "") continue;
    const at = String(row.paid_at || row.created_at);
    const exact = Boolean(row.paid_at);
    referred.push({ at, by: 1, exact });
    if (!earning.has(code)) {
      earning.add(code);
      earners.push({ at, by: 1, exact });
    }
  }

  /*
   * What each order drew on, and what each kitchen has taken.
   *
   * An order from two counters on one car is the thing no other way of
   * getting food onto this campus can do, so it is worth a badge of its
   * own rather than being buried in the order count.
   */
  const kitchenOf = new Map<string, string>(
    itemRows.map((row) => [String(row.id), String(row.restaurant_id)])
  );
  const drewOn = new Map<string, Set<string>>();
  const spentWith = new Map<string, Map<string, number>>();
  for (const line of lineRows) {
    const place = kitchenOf.get(String(line.menu_item_id));
    if (!place) continue;
    const order = String(line.order_id);
    if (!drewOn.has(order)) drewOn.set(order, new Set());
    drewOn.get(order)!.add(place);
    if (!spentWith.has(order)) spentWith.set(order, new Map());
    const mine = spentWith.get(order)!;
    mine.set(
      place,
      (mine.get(place) ?? 0) +
        Number(line.unit_price_at_order ?? 0) * Number(line.qty ?? 1)
    );
  }

  const inOrder = [...paid].sort((a, b) =>
    String(a.paid_at || a.created_at) < String(b.paid_at || b.created_at) ? -1 : 1
  );

  const mixed: Happening[] = [];
  const throughKitchen = new Map<string, number>();
  const bestKitchen: Happening[] = [];
  const groupsSeen = new Map<string, number>();
  const shared: Happening[] = [];
  for (const row of inOrder) {
    const order = String(row.id ?? "");
    const at = String(row.paid_at || row.created_at);
    const exact = Boolean(row.paid_at);

    if ((drewOn.get(order)?.size ?? 0) > 1) mixed.push({ at, by: 1, exact });

    for (const [place, spent] of spentWith.get(order) ?? []) {
      const sofar = (throughKitchen.get(place) ?? 0) + spent;
      throughKitchen.set(place, sofar);
      bestKitchen.push({ at, by: sofar, exact });
    }

    // A shared delivery is two people on one fee. Somebody who started a
    // group and had nobody join carries a group_id and is on their own, so
    // counting the id counted a group of one. Dated to the second person
    // paying, which is the moment it became shared.
    const group = String(row.group_id ?? "");
    if (group !== "") {
      const many = (groupsSeen.get(group) ?? 0) + 1;
      groupsSeen.set(group, many);
      if (many === 2) shared.push({ at, by: 1, exact });
    }
  }

  /*
   * A basket somebody walked away from that you went and got back.
   *
   * Taken from the button you press on the carts page, not from anything
   * the site worked out for itself. The first version counted a cart that
   * had been "alerted" and later bought, and alerted_at is the eight
   * o'clock email to the shop rather than a word to the customer: nobody
   * had been chased, they came back on their own, and one order closing
   * two of their carts counted twice.
   *
   * Marked by hand means somebody decided it, which is the only way this
   * is worth counting.
   */
  const rescued: Happening[] = cartRows
    .filter((row) => String(row.handled_reason ?? "").toLowerCase().startsWith("ordered"))
    .map((row) => ({ at: String(row.handled_at), by: 1, exact: true }));

  const streams: Record<string, Happening[]> = {
    rescued,
    blocks,
    oneBlock,
    referred,
    earners,
    mixed,
    bestKitchen,
    shared,
    took: paid.map((row) => ({
      at: String(row.paid_at || row.created_at),
      by: Number(row.total ?? 0),
      exact: Boolean(row.paid_at),
    })),
    kept,
    bags: delivered.map((row) => ({ ...handover(row), by: 1 })),
    runs: batchRows
      // A run that carried something, which is the only kind worth
      // counting. This was every batch marked closed, and a batch closes
      // whether or not anybody ordered onto it: the badge was counting
      // twenty empty Tuesdays and missing the fifteen real runs, which are
      // marked delivered rather than closed. Asked of the orders instead,
      // so no status can lie about it.
      .filter((row) => carried.has(String(row.id)))
      .map((row) => ({
        at: String(row.settled_at || row.run_date),
        by: 1,
        exact: Boolean(row.settled_at),
      })),
    // Somebody who paid, not somebody who filled a basket. A customer row
    // is written at checkout, so counting those counted every abandoned
    // cart as a customer.
    people: firstPaid,
    again,
    stars: orderRows
      .filter(
        (row) =>
          Number(row.rating) === 5 && row.rated_at && !isGone(String(row.status))
      )
      .map((row) => ({ at: String(row.rated_at), by: 1, exact: true })),
    boxes: paid
      .filter((row) => row.box_id)
      .map((row) => ({
        at: String(row.paid_at || row.created_at),
        by: 1,
        exact: Boolean(row.paid_at),
      })),
    kitchens: kitchenRows
      .filter((row) => row.active !== false)
      .map((row) => ({ at: String(row.created_at), by: 1, exact: true })),
  };

  // The profit figure itself comes from the one place that works it out,
  // rather than from adding these events up again. The board and the
  // dashboard disagreeing about what the shop made is worse than either of
  // them being wrong, because then neither can be trusted.
  // One run's profit is not a thing that adds up: a stream of sizes, where
  // the badge is about the biggest single one rather than the total.
  streams.bestRun = money.byRun.map((run) => ({
    at: run.runDate,
    by: run.profit,
    exact: false,
  }));

  // How full a car got. The settled time where there is one, because that
  // is a moment; the run's own day otherwise.
  streams.fullestRun = money.byRun
    .filter((run) => run.orders > 0)
    .map((run) => ({
      at: settledOn.get(run.id) ?? run.runDate,
      by: run.orders,
      exact: settledOn.has(run.id),
    }));

  return { streams, profit: money.profit, blockCount: hostelRows.length };
}

/** The running total, and the moment it crossed each goal. */
function crossing(
  happenings: Happening[],
  goal: number,
  total?: number
): { got: number; when: string; exact: boolean } {
  let running = 0;
  for (const one of [...happenings].sort(by)) {
    running += one.by;
    if (running >= goal) {
      // Keep counting for the total, but the moment is this one.
      const rest = [...happenings].sort(by);
      return {
        got: total ?? rest.reduce((sum, row) => sum + row.by, 0),
        when: one.at,
        exact: one.exact,
      };
    }
  }
  return { got: total ?? running, when: "", exact: false };
}

/**
 * The biggest single one, and when it happened.
 *
 * A different question from the running total: nobody earns "ten thousand
 * on one run" by doing a thousand ten times, and summing these would say
 * they had. Earliest first, so a goal is dated to the first time it was
 * beaten rather than the best time.
 */
function peak(
  happenings: Happening[],
  goal: number
): { got: number; when: string; exact: boolean } {
  const most = happenings.reduce((top, one) => Math.max(top, one.by), 0);
  const first = [...happenings].sort(by).find((one) => one.by >= goal);
  return {
    got: most,
    when: first?.at ?? "",
    exact: first?.exact ?? false,
  };
}

/**
 * The board.
 *
 * Earned first, newest at the top of those, because the point of a board is
 * what you just did. The locked ones follow in the order they will fall, so
 * the top of that half is the one worth chasing this month.
 */
export async function board(): Promise<Board> {
  const { streams, profit, blockCount } = await history();
  const at = (key: string) => streams[key] ?? [];

  const badges: Badge[] = [
    tier("took", "Money in", at("took"), "money", [
      [1, "Open for business", "The first naira anybody paid you"],
      [100_000, "A hundred thousand", "₦100,000 taken, all in"],
      [500_000, "Half a million", "₦500,000 taken"],
      [1_000_000, "A million", "₦1,000,000 through the shop"],
      [5_000_000, "Five million", "₦5,000,000 taken"],
    ]),
    tier("kept", "Profit", at("kept"), "money", [
      [10_000, "In the black", "₦10,000 kept after the food and the car"],
      [100_000, "A hundred thousand kept", "₦100,000 of profit"],
      [500_000, "Half a million kept", "₦500,000 of profit"],
      [1_000_000, "A million kept", "₦1,000,000 of profit"],
    ], profit),
    tier("bags", "Deliveries", at("bags"), "count", [
      [1, "First bag", "One order handed over"],
      [50, "Fifty bags", "50 orders delivered"],
      [250, "Two hundred and fifty", "250 orders delivered"],
      [1_000, "A thousand bags", "1,000 orders delivered"],
    ]),
    tier("runs", "Runs", at("runs"), "count", [
      [1, "First run", "One run closed and delivered"],
      [25, "Twenty five runs", "25 runs out and back"],
      [100, "A hundred runs", "100 runs"],
      [500, "Five hundred runs", "500 runs"],
    ]),
    tier("people", "Customers", at("people"), "count", [
      [1, "Somebody ordered", "The first person who trusted you with money"],
      [25, "Twenty five people", "25 customers on the books"],
      [100, "A hundred people", "100 customers"],
      [500, "Five hundred people", "500 customers"],
    ]),
    tier("again", "Regulars", at("again"), "count", [
      [1, "They came back", "Somebody ordered a second time"],
      [25, "Twenty five regulars", "25 people have ordered more than once"],
      [100, "A hundred regulars", "100 people have ordered more than once"],
    ]),
    tier("stars", "Five stars", at("stars"), "count", [
      [1, "First five stars", "Somebody gave you full marks"],
      [10, "Ten five stars", "10 full marks"],
      [50, "Fifty five stars", "50 full marks"],
    ]),
    tier("boxes", "Boxes", at("boxes"), "count", [
      [1, "First box", "Somebody bought a box you packed"],
      [25, "Twenty five boxes", "25 boxes sold"],
      [100, "A hundred boxes", "100 boxes sold"],
    ]),
    tier("blocks", "Blocks", at("blocks"), "count", [
      [1, "First block", "A bag carried into a hostel"],
      [5, "Five blocks", "Delivered into 5 different blocks"],
      [10, "Ten blocks", "Delivered into 10 different blocks"],
      ...(blockCount > 10
        ? ([[blockCount, "Every block", `All ${blockCount} blocks on the list`]] as [
            number,
            string,
            string,
          ][])
        : []),
    ]),
    tier("mixed", "Mixed orders", at("mixed"), "count", [
      [1, "Two counters, one car", "An order drawing on more than one kitchen"],
      [10, "Ten mixed orders", "10 orders from more than one kitchen"],
      [50, "Fifty mixed orders", "50 orders from more than one kitchen"],
    ]),
    best("brand", "One kitchen", at("bestKitchen"), "money", [
      [50_000, "A kitchen worth having", "₦50,000 of food through one kitchen"],
      [250_000, "A kitchen that counts", "₦250,000 through one kitchen"],
      [1_000_000, "A kitchen worth a meeting", "₦1,000,000 through one kitchen"],
    ]),
    tier("shared", "Shared deliveries", at("shared"), "count", [
      [1, "First group", "A delivery split between friends"],
      [10, "Ten groups", "10 shared deliveries"],
      [50, "Fifty groups", "50 shared deliveries"],
    ]),
    tier("sent", "Promoters", at("referred"), "count", [
      [1, "Somebody sent somebody", "The first order off a promoter's link"],
      [10, "Ten sent in", "10 orders brought in by promoters"],
      [50, "Fifty sent in", "50 orders brought in by promoters"],
      [200, "Two hundred sent in", "200 orders brought in by promoters"],
    ]),
    tier("earners", "Promoters", at("earners"), "count", [
      [1, "One earning", "A promoter has earned something"],
      [5, "Five earning", "5 promoters have brought in an order"],
      [10, "Ten earning", "10 promoters have brought in an order"],
    ]),
    tier("rescued", "Baskets saved", at("rescued"), "count", [
      [1, "Brought back", "A left basket you marked as ordered another way"],
      [10, "Ten brought back", "10 baskets brought back"],
      [50, "Fifty brought back", "50 baskets brought back"],
    ]),
    best("block", "One block", at("oneBlock"), "count", [
      [5, "A block that knows you", "5 bags into the same hostel"],
      [25, "A block that relies on you", "25 bags into one hostel"],
      [100, "You live there", "100 bags into one hostel"],
    ]),
    best("full", "Fullest run", at("fullestRun"), "count", [
      [3, "Three on a car", "3 orders on the same run"],
      [5, "Five on a car", "5 orders on one run"],
      [10, "Ten on a car", "10 orders on one run"],
      [20, "A full car", "20 orders on a single run"],
    ]),
    best("run", "Best run", at("bestRun"), "money", [
      [5_000, "A good run", "₦5,000 kept on one run"],
      [10_000, "A very good run", "₦10,000 kept on a single run"],
      [25_000, "A great run", "₦25,000 kept on one run"],
      [50_000, "The run of the year", "₦50,000 kept on one run"],
    ]),
    tier("kitchens", "Kitchens", at("kitchens"), "count", [
      [5, "Five kitchens", "5 places on the menu at once"],
      [10, "Ten kitchens", "10 places on the menu"],
      [20, "Twenty kitchens", "20 places on the menu"],
    ]),
  ].flat();

  const done = (one: Badge) => one.when !== "";
  const sorted = [...badges].sort((a, b) => {
    if (done(a) !== done(b)) return done(a) ? -1 : 1;
    // Newest first among the earned: the last thing you did is the thing
    // worth seeing. Closest first among the rest.
    if (done(a)) return a.when < b.when ? 1 : a.when > b.when ? -1 : 0;
    return b.got / b.goal - a.got / a.goal;
  });

  return {
    badges: sorted,
    earned: badges.filter(done).length,
    next: sorted.find((one) => !done(one)) ?? null,
  };
}

/** A family measured by the biggest single one rather than the total. */
function best(
  id: string,
  group: string,
  happenings: Happening[],
  unit: Unit,
  steps: [number, string, string][]
): Badge[] {
  return steps.map(([goal, name, what]) => {
    const { got, when, exact } = peak(happenings, goal);
    return {
      id: `${id}-${goal}`,
      group,
      name,
      what,
      goal,
      got,
      unit,
      when,
      exact,
      peak: true,
    };
  });
}

/** One family of badges, all measuring the same thing at rising goals. */
function tier(
  id: string,
  group: string,
  happenings: Happening[],
  unit: Unit,
  steps: [number, string, string][],
  /** Where the running total is worked out elsewhere and this is only the
   *  history behind it, as profit is. */
  total?: number
): Badge[] {
  return steps.map(([goal, name, what]) => {
    const { got, when, exact } = crossing(happenings, goal, total);
    return { id: `${id}-${goal}`, group, name, what, goal, got, unit, when, exact };
  });
}
