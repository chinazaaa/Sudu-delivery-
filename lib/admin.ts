import { db } from "./supabase";
import type { Chosen } from "./picks";
import { WINDOW_DAYS } from "./other-money";
import { feeFor } from "./fees";
import { activeBands } from "./settings";
import { getBatch } from "./batches";
import { lagosToday, runDateLabel } from "./time";
import type { BatchStage } from "./stages";
import { carLabel } from "./view";
import { counterKey } from "./runner";
import { DEFAULT_MARKUP, lineCost, markupOf } from "./cost-price";
import { safeSettings } from "./settings";
import { ALERTS_AT } from "./mail";
import { isGone, isPaid, NOT_ORDERS_SQL } from "./orders";
import { groupShortfalls, refundsOwed, settleGroupFees, type GroupShortfall } from "./groups";
import { linesFor, type OrderLine } from "./orders";
import type { Batch, Order, Promoter } from "./types";


/**
 * Each counter's markup, by the name the order lines carry.
 *
 * Null is the ordinary case: nearly every counter uses the shop's own
 * figure and only the odd one out stores its own. Kept here as well as in
 * runner-server because the dependency has to run this way: the run sheet
 * reads the admin sheet, so the admin sheet cannot read the run sheet.
 */
export async function counterMarkups(): Promise<Record<string, number>> {
  const shop = markupOf((await safeSettings()).food_markup);

  const { data } = await db()
    .from("restaurants")
    .select("name, markup")
    .overrideTypes<{ name: string; markup: number | null }[]>();

  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    out[row.name] = row.markup === null ? shop : markupOf(row.markup, shop);
  }
  return out;
}

export type CounterLine = {
  name: string;
  choices: string[];
  /** The same choices with the question each one answers, so a free
   *  "Regular" reads as the size at the counter. */
  picks?: Chosen[];
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
  /** What the menu asks for this today, as against `unitPrice`, which is
   *  what it asked for when this order was placed and never moves again.
   *  The offer to put the menu up has to measure itself against the menu,
   *  or it can never be satisfied. */
  menuPrice: number;
  /** What the counter actually charges for one, as somebody typed it in
   *  off a board or a receipt. Zero where nobody has said, and then the
   *  sheet works it out by taking the shop's markup off the selling price,
   *  which is arithmetic rather than knowledge. Read live, so correcting a
   *  cost this afternoon corrects tonight's sheet. */
  costPrice: number;
};
export type CounterGroup = {
  restaurant: string;
  lines: CounterLine[];
  expectedFoodTotal: number;
  /** What this counter sells melts, so it is the last stop and cannot be
   *  moved up the route. See `meltingStops`. */
  melts?: boolean;
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
  /** What to greet each person as, by phone, where the shop has said.
   *  Missing means the first word of their name. */
  callsThem: Record<string, string>;
  summary: {
    paidCount: number;
    unpaidCount: number;
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

  /*
   * Everything going out the same evening, not just this batch.
   *
   * A scheduled run and a car of its own on one night are two batches
   * because they were two promises, and they are one drive. Kept apart,
   * the sheet sent her to Burger King twice and told her to buy three
   * burgers in two readings, when it is two hamburgers and a chicken on
   * one visit. So the shopping, the bags and the people are the day's;
   * the stage, the costs and the books stay this batch's own.
   */
  const alsoGoing = await db()
    .from("batches")
    .select("id, kind, status")
    .eq("run_date", batch.run_date)
    .neq("status", "cancelled");
  const sameEvening = ((alsoGoing.data ?? []) as {
    id: string;
    kind?: string | null;
  }[])
    .filter((one) => (one.kind ?? "run") === "run" || one.kind === "same_day")
    .map((one) => one.id);
  // A parcel or a box day is its own trip and keeps its own sheet.
  const driving =
    (batch.kind ?? "run") === "run" || batch.kind === "same_day"
      ? [...new Set([batchId, ...sameEvening])]
      : [batchId];

  const { data, error } = await db()
    .from("orders")
    .select("*")
    .in("batch_id", driving)
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
  const unpaid = orders.filter(
    (o) => o.status === "pending" && o.batch_id === batchId
  );
  const paidIds = new Set(paid.map((o) => o.id));

  /*
   * The money is this batch's own, the shopping is the evening's.
   *
   * What she buys and who she hands it to is one trip whatever door the
   * orders came through. What was taken, what it cost and what it earned
   * belongs to the promise somebody paid for: a car's fee is a car's fee
   * and a run's is a run's, and putting the evening's takings on both
   * pages would be the same money counted twice.
   */
  const mineOnly = paid.filter((o) => o.batch_id === batchId);

  /*
   * Nine questions asked at once.
   *
   * None of them needs an answer from any of the others: they are the
   * receipts, the commission, which counters melt, who collects their own
   * bag, the refunds, the short groups, the PINs and who to call. They were
   * nine awaits one after another, five of them hidden inside the object
   * this function returns, where properties are worked out in the order
   * they are written. That is nine round trips to Lagos in series every
   * time anybody ticks a box on a run sheet, which is the page somebody
   * presses most, and it is why the board felt like treacle.
   */
  const [
    spendRows,
    { total: commission, by: commissionBy },
    goLast,
    ownBags,
    refunds,
    groupsShort,
    pins,
    callsThem,
    markups,
  ] = await Promise.all([
    // What each thing really cost, where somebody has said.
    // Read across the evening, written against the batch whose page it was
    // typed on: one shopping trip, one set of receipts.
    db()
      .from("counter_spend")
      .select("line_key, paid, recovered")
      .in("batch_id", driving),
    commissionFor(mineOnly),
    meltingStops(),
    collectingSeparately(batchId),
    refundsOwed(batchId),
    groupShortfalls(batchId),
    pinsFor(orders.map((o) => o.customer_phone)),
    callsThemFor(orders.map((o) => o.customer_phone)),
    /*
     * What a line is reckoned to cost where nobody has typed a receipt.
     *
     * It used to be the menu price, which was never a guess at the cost at
     * all: the menu price IS the cost with the shop's markup already on it,
     * so using it claimed the shop paid exactly what it charged and earned
     * nothing whatever on food. That is where the markup went. It was right
     * when the shop had no idea what a counter asks for, and every item now
     * carries a cost, hundreds of them checked against a board.
     *
     * The same arithmetic the run sheet and the counter sheet already use,
     * so the three cannot disagree. They did: the counter sheet read 7,304
     * and the tile above it read 8,400, on one screen.
     */
    counterMarkups(),
  ]);

  const rows = (spendRows.data ?? []) as {
    line_key: string;
    paid: number;
    recovered?: number;
  }[];
  const spentOn = new Map(rows.map((row) => [row.line_key, row.paid]));
  // Money the customer handed back, which the shop is therefore not out.
  const gotBack = new Map(rows.map((row) => [row.line_key, row.recovered ?? 0]));

  const costs =
    batch.fuel_cost + batch.driver_cost + (batch.transport_cost ?? 0) + batch.other_cost;

  // What the food actually cost. The menu price is only a guess at it: buy
  // enough from one counter and they give it to you for less, and that
  // difference is margin the sheet was throwing away.
  const menuCost = sum(mineOnly, (o) => o.subtotal_food);

  // Typed-in figures first, and only for the lines somebody has actually
  // typed: the rest stay at the menu price, so a half-finished reconcile
  // still leaves an honest number rather than a wrong one.
  const counterLines = groupForCounter(
    lines.filter((l) => paidIds.has(l.order_id)),
    batch.stop_order ?? null,
    goLast
  );
  const everyLine = counterLines.flatMap((place) => place.lines);
  const reconciled = everyLine.filter((line) => spentOn.has(line.key));

  /*
   * Both of these are the same list of item ids asked two ways, so they go
   * together: what the till charges and what the menu says.
   *
   * And a cost somebody actually wrote down beats the sum, here as on the
   * sheet: the sum is the guess that stands in until there is one, and the
   * two must agree or the tile and the stop under it print different money
   * for the same food.
   */
  const itemIds = everyLine.map((line) => line.itemId);
  const [atCounter, onMenu, perChoice] = await Promise.all([
    counterCosts(itemIds),
    menuPrices(itemIds),
    choiceCosts(itemIds),
  ]);

  /*
   * One of a thing, at the counter, with the size on it.
   *
   * The cost on an item is the cost of the ordinary one. A large pizza is
   * a third as much again, and the sheet was printing the ordinary price
   * for it: whoever is at the till reads nine thousand while the board
   * says twelve, on every sized thing on every run.
   *
   * The choices are added in the same order of preference as everything
   * else here: a figure somebody wrote down for that choice, and failing
   * that the shop's markup taken off what the choice sells for, which is
   * what the line is already doing for the thing itself.
   *
   * Only where the item's own cost is known. Where it is not, the whole
   * line is worked backwards off the selling price, options and all, and
   * adding them twice would be worse than not adding them at all.
   */
  const costOne = (
    restaurant: string,
    line: { unitPrice: number; itemId: string; picks?: Chosen[] }
  ): number => {
    const base = atCounter.get(line.itemId) ?? 0;
    const markup = markups[restaurant] ?? DEFAULT_MARKUP;
    if (base <= 0) return lineCost(line.unitPrice, 1, markup);

    const said = perChoice.get(line.itemId) ?? new Map<string, number>();
    const sells = onMenu.get(line.itemId) ?? 0;
    // What the choices add to the price, as the menu stands today. The
    // line's own unit price is what it cost the night it was ordered, and
    // the item's menu price moves under it; the difference is the options.
    const extras = sells > 0 ? Math.max(0, line.unitPrice - sells) : 0;

    const written = (line.picks ?? []).reduce(
      (sum, pick) => sum + (said.get(pick.name.trim().toLowerCase()) ?? 0),
      0
    );
    return base + (written > 0 ? written : lineCost(extras, 1, markup));
  };
  const shouldCost = (
    restaurant: string,
    line: { qty: number; unitPrice: number; itemId: string; picks?: Chosen[] }
  ) => costOne(restaurant, line) * line.qty;

  const reckoned = counterLines.reduce(
    (total, place) =>
      total +
      place.lines.reduce(
        (here, line) =>
          here +
          (spentOn.has(line.key)
            ? (spentOn.get(line.key) as number) - (gotBack.get(line.key) ?? 0)
            : shouldCost(place.restaurant, line)),
        0
      ),
    0
  );

  const foodCost =
    reconciled.length > 0
      ? reckoned
      : batch.food_spend > 0
        ? batch.food_spend
        : reckoned;
  const margin = sum(mineOnly, (o) => o.total) - foodCost;

  return {
    batch,
    counter: groupForCounter(
      lines.filter((l) => paidIds.has(l.order_id)),
      batch.stop_order ?? null,
      goLast
    ).map(
      (place) => ({
        ...place,
        lines: place.lines.map((line) => ({
          ...line,
          paid: spentOn.has(line.key) ? (spentOn.get(line.key) as number) : null,
          recovered: gotBack.get(line.key) ?? 0,
          menuPrice: onMenu.get(line.itemId) ?? line.unitPrice,
          // What the till will ask for one of these, the size on it
          // included. Zero where nobody has written the item's own cost
          // down, and then the sheet falls back to taking the markup off
          // the selling price, which it has always done.
          costPrice:
            (atCounter.get(line.itemId) ?? 0) > 0
              ? costOne(place.restaurant, line)
              : 0,
        })),
      })
    ),
    handout: bagsFor(paid.map(withLines), ownBags),
    unpaid: unpaid.map(withLines),
    refunds,
    groupsShort,
    pins,
    callsThem,
    summary: {
      paidCount: mineOnly.length,
      unpaidCount: unpaid.length,
      gross: sum(mineOnly, (o) => o.total),
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
 * What the shop calls each of these people, where somebody has said.
 *
 * Asked for on its own, and forgiving of a database that has not had the
 * migration run yet: the run sheet is not the place to fall over because a
 * greeting could not be looked up.
 */
async function callsThemFor(phones: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(phones)];
  if (unique.length === 0) return {};

  try {
    const { data, error } = await db()
      .from("customers")
      .select("phone, calls_them")
      .in("phone", unique);
    if (error) return {};
    return Object.fromEntries(
      (data ?? [])
        .map((row) => [row.phone as string, ((row.calls_them as string) ?? "").trim()])
        .filter(([, called]) => called !== "")
    );
  } catch {
    return {};
  }
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

/** What the menu asks for these items now, so an offer to raise a price can
 *  tell whether it has already been raised. */
async function menuPrices(ids: string[]): Promise<Map<string, number>> {
  const wanted = [...new Set(ids.filter(Boolean))];
  if (wanted.length === 0) return new Map();
  const { data } = await db().from("menu_items").select("id, price_food").in("id", wanted);
  return new Map(
    (data ?? []).map((row: any) => [row.id as string, Number(row.price_food ?? 0)])
  );
}

/**
 * What a counter really charges for a thing, where somebody has said.
 *
 * The run sheet worked the counter price out backwards, by taking the
 * shop's markup off the selling price. That was right when the shop had no
 * idea what a counter asks for, and it is arithmetic rather than
 * knowledge: a cost typed in from a board or a receipt is the answer, and
 * the sum is only the guess that stands in until there is one.
 *
 * It showed. Fantasy ice cream was put in at 1,200 off the counter's own
 * shelf and the sheet went on printing 1,130, because 1,300 less fifteen
 * per cent is 1,130 and nothing in the sum had changed. Somebody stands at
 * a till reading one number while it asks for another.
 *
 * Read live rather than off the order, so correcting a cost this afternoon
 * corrects tonight's sheet: the order carries what it sold for, which must
 * never move, and what it costs us is the shop's own note about the world
 * and moves whenever the world does.
 */
export async function counterCosts(ids: string[]): Promise<Map<string, number>> {
  const wanted = [...new Set(ids.filter(Boolean))];
  if (wanted.length === 0) return new Map();
  try {
    const { data, error } = await db()
      .from("menu_items")
      .select("id, price_cost")
      .in("id", wanted);
    // Before the column exists there is nothing to read, and every line
    // falls back to the markup sum, which is how it worked before.
    if (error) return new Map();
    const found = new Map<string, number>();
    for (const row of (data ?? []) as { id: string; price_cost?: number | null }[]) {
      const cost = Number(row.price_cost ?? 0);
      // Nought is nobody having said, not a thing that is free.
      if (cost > 0) found.set(row.id, Math.round(cost));
    }
    return found;
  } catch {
    return new Map();
  }
}

/**
 * What each choice adds at the counter, by the words it is called.
 *
 * A pizza's cost is the cost of the ordinary one. Somebody orders a large,
 * the sheet printed the ordinary one's price, and whoever is standing at
 * the till reads nine thousand while the board says twelve. Every sized
 * thing on every run, and the gap is not small: on a pizza the size is a
 * third of the money.
 *
 * By name rather than by id, because that is all a sheet line carries: it
 * keeps the words somebody chose, not the row they came from, so a choice
 * renamed in admin stops matching and falls back to the sum, which is the
 * behaviour it had before this existed.
 *
 * Nought means nobody has written this one down. The caller then takes the
 * shop's markup off what the choice sells for, which is arithmetic rather
 * than knowledge and still beats ignoring it.
 */
export async function choiceCosts(
  itemIds: string[]
): Promise<Map<string, Map<string, number>>> {
  const wanted = [...new Set(itemIds.filter(Boolean))];
  const found = new Map<string, Map<string, number>>();
  if (wanted.length === 0) return found;

  try {
    const { data: groups, error } = await db()
      .from("item_option_groups")
      .select("id, menu_item_id")
      .in("menu_item_id", wanted);
    if (error || !groups || groups.length === 0) return found;

    const itemOf = new Map(
      (groups as { id: string; menu_item_id: string }[]).map((row) => [
        row.id,
        row.menu_item_id,
      ])
    );

    const { data: options } = await db()
      .from("item_options")
      .select("group_id, name, price_cost")
      .in("group_id", [...itemOf.keys()]);

    for (const row of (options ?? []) as {
      group_id: string;
      name: string;
      price_cost?: number | null;
    }[]) {
      const cost = Math.round(Number(row.price_cost ?? 0));
      if (cost <= 0) continue;
      const item = itemOf.get(row.group_id);
      const said = String(row.name ?? "").trim();
      if (!item || said === "") continue;
      const mine = found.get(item) ?? new Map<string, number>();
      mine.set(said.toLowerCase(), cost);
      found.set(item, mine);
    }
    return found;
  } catch {
    return found;
  }
}

/**
 * The counters whose food will not survive the rest of the drive.
 *
 * Ice cream bought first is ice cream handed over as soup, and no amount
 * of arranging the route by hand fixes it reliably: a run is arranged once
 * and then another order comes in. So it is a thing a counter is rather
 * than a thing somebody remembers, ticked on the restaurant itself, and
 * the route puts every one of them at the end whatever else is decided.
 *
 * Asked for defensively: a database without the column yet answers "none
 * of them", which is how the route worked before this existed.
 */
export async function meltingStops(): Promise<string[]> {
  try {
    const { data, error } = await db()
      .from("restaurants")
      .select("name")
      .eq("melts", true);
    if (error) return [];
    return ((data ?? []) as { name: string }[])
      .map((one) => one.name)
      .filter((one) => one !== "");
  } catch {
    return [];
  }
}

/**
 * Orders collapsed by restaurant into totals. This is what she reads aloud at
 * the counter, so it is one line per distinct item, not one per order.
 */
export function groupForCounter(
  lines: OrderLine[],
  /** The order this run is actually driven in, when somebody has arranged
   *  it. Anything not named keeps its place at the end, alphabetically, so a
   *  restaurant added after the arranging still appears. */
  stopOrder: string[] | null = null,
  /** Counters that have to be the last stops, by name, whatever the
   *  arrangement says. See `meltingStops`. */
  goLast: string[] = []
): CounterGroup[] {
  const byRestaurant = new Map<string, Map<string, CounterLine>>();

  for (const line of lines) {
    const items = byRestaurant.get(line.restaurant) ?? new Map<string, CounterLine>();
    const choices = [...line.choices].sort();
    // A large pepperoni and a small margherita are two different things to
    // order, so the choices are part of what makes a counter line. The
    // rule itself lives in runner.ts, because the run sheet has to ask the
    // same question in the same words to say who ordered a line.
    const key = counterKey(line);
    const existing = items.get(key);
    if (existing) existing.qty += line.qty;
    else
      items.set(key, {
        name: line.name,
        choices,
        // Said in the order the choices are sorted in, so the label and
        // the word it labels cannot drift apart.
        picks: choices.map((name) => ({
          group: (line.picks ?? []).find((pick) => pick.name === name)?.group ?? "",
          name,
        })),
        qty: line.qty,
        unitPrice: line.unit_price_at_order,
        key,
        paid: null,
        itemId: line.menu_item_id,
        recovered: 0,
        // Filled in from the menu below. Grouping does not read it, so
        // nought is the honest answer until somebody does.
        costPrice: 0,
        // Grouping does not read the menu, so the price on the line is the
        // honest answer until somebody fills it in.
        menuPrice: line.unit_price_at_order,
      });
    byRestaurant.set(line.restaurant, items);
  }

  const melts = new Set(goLast);
  const groups = [...byRestaurant.entries()].map(([restaurant, items]) => {
    const lines = [...items.values()].sort((a, b) => b.qty - a.qty);
    return {
      restaurant,
      lines,
      expectedFoodTotal: lines.reduce((t, l) => t + l.qty * l.unitPrice, 0),
      melts: melts.has(restaurant),
    };
  });

  return sortStops(groups, stopOrder, goLast);
}

/**
 * The stops in the order they are driven.
 *
 * Without an arrangement this is alphabetical, which is at least steady:
 * before, it came out in whatever order the orders happened to arrive, so the
 * same run read differently after every new order.
 *
 * With one, named stops lead in the order given and anything unnamed follows
 * alphabetically. A restaurant that joins the run after somebody arranged it
 * therefore appears at the end rather than disappearing, which is the only
 * safe way to be wrong here: a missing stop is food nobody buys.
 */
export function sortStops<T extends { restaurant: string }>(
  groups: T[],
  stopOrder: string[] | null,
  /** Counters that melt, by name. They go last whatever the arrangement
   *  says, keeping their own order among themselves. */
  goLast: string[] = []
): T[] {
  const place = new Map((stopOrder ?? []).map((name, index) => [name, index]));
  const last = place.size;
  const melts = new Set(goLast);

  return [...groups].sort((a, b) => {
    // Nothing beats ice cream to the end of the list. An arrangement that
    // says otherwise is an arrangement made before somebody added a tub to
    // the run, and it is not the sort of mistake you get to find out about
    // until the bag is handed over.
    const meltsA = melts.has(a.restaurant);
    const meltsB = melts.has(b.restaurant);
    if (meltsA !== meltsB) return meltsA ? 1 : -1;

    const left = place.get(a.restaurant) ?? last;
    const right = place.get(b.restaurant) ?? last;
    return left === right
      ? a.restaurant.localeCompare(b.restaurant)
      : left - right;
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
export async function commissionFor(
  orders: Pick<Order, "customer_phone" | "box_id">[]
): Promise<{ total: number; by: Commission[] }> {
  if (orders.length === 0) return { total: 0, by: [] };
  const earns = await earningRule(orders);

  const tally = new Map<string, Commission>();
  for (const order of orders) {
    const earned = earns(order);
    if (!earned) continue;

    const now = tally.get(earned.code) ?? {
      code: earned.code,
      name: earned.name,
      orders: 0,
      amount: 0,
    };
    tally.set(earned.code, {
      ...now,
      orders: now.orders + 1,
      amount: now.amount + earned.amount,
    });
  }

  const by = [...tally.values()].sort((a, b) => b.amount - a.amount);
  return { total: by.reduce((sum, one) => sum + one.amount, 0), by };
}

/**
 * The same commission, totalled per run.
 *
 * The profit page shows a run-by-run table, and every run on it owes its own
 * commission. Asking `commissionFor` once per run is two queries a run, and
 * the window on that page can be a year, so the rule is read once here and
 * the orders are tallied against it in memory.
 */
export async function commissionByRun(
  orders: Pick<Order, "batch_id" | "customer_phone" | "box_id">[]
): Promise<Map<string, number>> {
  const owed = new Map<string, number>();
  if (orders.length === 0) return owed;
  const earns = await earningRule(orders);

  for (const order of orders) {
    const earned = earns(order);
    if (!earned) continue;
    const key = String(order.batch_id);
    owed.set(key, (owed.get(key) ?? 0) + earned.amount);
  }
  return owed;
}

/**
 * Who earns what on an order, read from the database once.
 *
 * An order earns for the promoter whose customer it is, at that promoter's
 * own rate, and an order that came from nobody costs nothing. One copy of
 * that rule, because the two callers above disagreeing about it is how the
 * profit page and the run list came to show different money.
 */
async function earningRule(
  orders: Pick<Order, "customer_phone" | "box_id">[]
): Promise<
  (order: Pick<Order, "customer_phone" | "box_id">) =>
    | { code: string; name: string; amount: number }
    | null
> {
  const phones = [...new Set(orders.map((one) => one.customer_phone))];
  const [{ data: customers }, { data: promoters }] = await Promise.all([
    db().from("customers").select("phone, promoter_code").in("phone", phones),
    db().from("promoters").select("code, name, rate, box_rate"),
  ]);

  const broughtBy = new Map(
    ((customers ?? []) as { phone: string; promoter_code?: string | null }[]).map((one) => [
      one.phone,
      (one.promoter_code ?? "").trim(),
    ])
  );
  const rates = new Map(
    (
      (promoters ?? []) as {
        code: string;
        name: string;
        rate: number;
        box_rate?: number;
      }[]
    ).map((one) => [one.code, one])
  );

  return (order) => {
    const code = broughtBy.get(order.customer_phone) ?? "";
    const promoter = code ? rates.get(code) : undefined;
    if (!promoter) return null;
    // A box pays its own rate, which is what the promoter's own earnings
    // page has always paid them. Costing it at the ordinary rate here meant
    // the shop's profit was short of what it actually owed.
    const amount = order.box_id
      ? Number(promoter.box_rate ?? promoter.rate) || promoter.rate
      : promoter.rate;
    return { code, name: promoter.name || code, amount };
  };
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

export type BatchRow = Batch & {
  orderCount: number;
  /** The one order on a parcel's trip, so the list opens the order rather
   *  than a run sheet for a car carrying one bag. */
  parcelOrderId?: string;
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
    // A trip is driven like a run, so ice cream is the last stop here too.
    counter: groupForCounter(
      lines.filter((line) => paidIds.has(line.order_id)),
      null,
      await meltingStops()
    ),
    handout: paid.map(withLines),
    unpaid: orders.filter((o) => o.status === "pending").map(withLines),
    items: lines
      .filter((line) => paidIds.has(line.order_id))
      .reduce((sum, line) => sum + line.qty, 0),
    gross: sum(paid, (o) => o.total),
  };
}

/**
 * The day worth opening the driving sheet on.
 *
 * Today, while there is anything left to do with it. Once the last of
 * today is settled or delivered, today is a record rather than a job,
 * and the sheet should have moved on: it sat on a finished Saturday all
 * evening while tomorrow's run was the only thing anybody could act on.
 *
 * Nothing ahead either and it stays on today, because a page that says
 * "driving Saturday" over a day that is done is still better than one
 * that says nothing at all.
 */
export async function dayToDrive(): Promise<string> {
  const today = lagosToday();
  try {
    const { data, error } = await db()
      .from("batches")
      .select("run_date, kind, status, settled_at")
      .gte("run_date", today)
      .neq("status", "cancelled")
      .order("run_date", { ascending: true })
      .limit(60);
    if (error) return today;

    const going = ((data ?? []) as Batch[]).filter(
      (one) => (one.kind ?? "run") === "run" || one.kind === "same_day"
    );
    const unfinished = going.filter(
      (one) => one.settled_at === null && one.status !== "delivered"
    );

    if (unfinished.some((one) => one.run_date === today)) return today;
    return unfinished[0]?.run_date ?? today;
  } catch {
    return today;
  }
}

/**
 * The days with something going, for moving between them.
 *
 * The driving sheet follows the work, which means it moves on the moment
 * a day is finished, and then the day you have just driven is nowhere
 * you can click to. A few days either side is the whole of what anybody
 * wants from it: what went out this evening, and what goes out next.
 */
export async function daysGoing(): Promise<
  { day: string; bags: number }[]
> {
  const today = lagosToday();
  const shift = (days: number) => {
    const at = new Date(`${today}T12:00:00Z`);
    at.setUTCDate(at.getUTCDate() + days);
    return at.toISOString().slice(0, 10);
  };
  const from = shift(-3);
  const to = shift(7);
  try {
    const { data } = await db()
      .from("batches")
      .select("id, run_date, kind, status")
      .gte("run_date", from)
      .lte("run_date", to)
      .neq("status", "cancelled");

    const going = ((data ?? []) as Batch[]).filter(
      (one) => (one.kind ?? "run") === "run" || one.kind === "same_day"
    );
    if (going.length === 0) return [];

    const { data: orders } = await db()
      .from("orders")
      .select("batch_id, status")
      .in("batch_id", going.map((one) => one.id))
      .not("status", "in", NOT_ORDERS_SQL);

    const bags = new Map<string, number>();
    for (const order of (orders ?? []) as { batch_id: string; status: string }[]) {
      if (!isPaid(order.status)) continue;
      bags.set(order.batch_id, (bags.get(order.batch_id) ?? 0) + 1);
    }

    const byDay = new Map<string, number>();
    for (const one of going) {
      byDay.set(one.run_date, (byDay.get(one.run_date) ?? 0) + (bags.get(one.id) ?? 0));
    }

    // Days with nothing on them, in the past, are days that never
    // happened: the same rule the runs page keeps.
    return [...byDay.entries()]
      .filter(([day, count]) => count > 0 || day >= today)
      .map(([day, count]) => ({ day, bags: count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  } catch {
    return [];
  }
}

export type DrivingToday = TripSheet & {
  /** Every batch this sheet is made of, each keeping its own page: the
   *  costs, the profit and the stage all belong to one of them, and
   *  nothing here moves an order from the one it was ordered onto. */
  parts: {
    id: string;
    label: string;
    kind: string;
    paid: number;
    stage: BatchStage;
    /** Its share of what the day cost, so the whole can be added back up
     *  and typed once. See lib/day-costs.ts. */
    fuel: number;
    transport: number;
    driver: number;
    other: number;
    note: string;
  }[];
};

/**
 * Everything going out today, as one shopping trip.
 *
 * A scheduled run and a car of its own are two batches because they were
 * two promises: one shared trip at a run's price, one person's own trip
 * at a car's. They are not two drives. Nobody goes to Chicken Republic
 * twice in an evening because the orders arrived through different doors,
 * and the answer was to move orders from one batch onto the other by
 * hand, which quietly rewrites what each of them paid for.
 *
 * So nothing is moved. The counter list is added up across all of them
 * here, once, and each batch keeps its own page for its own costs and its
 * own stage. What is driven is one list; what is counted stays two.
 */
export async function drivingToday(date?: string): Promise<DrivingToday | null> {
  const day = date ?? lagosToday();

  /*
   * Everything with that date on it, finished or not.
   *
   * Delivered and settled were left out of this, on the reasoning that a
   * finished run is not work. It is still today: the sheet came up empty
   * on the evening of a day whose driving was done, and the one thing it
   * was being opened for was what had just gone out. Cancelled is the
   * only thing that never happened.
   */
  const { data: rows } = await db()
    .from("batches")
    .select("*")
    .eq("run_date", day)
    .neq("status", "cancelled");

  // A parcel is its own trip on a day agreed with whoever sent it, and
  // the skincare drop is its own shop on its own day.
  const batches = ((rows ?? []) as Batch[]).filter(
    (one) => (one.kind ?? "run") === "run" || one.kind === "same_day"
  );
  if (batches.length === 0) return null;

  const { data } = await db()
    .from("orders")
    .select("*")
    .in("batch_id", batches.map((one) => one.id))
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
    at: day,
    label: runDateLabel(day),
    // Driven like a run, so ice cream is the last stop here too.
    counter: groupForCounter(
      lines.filter((line) => paidIds.has(line.order_id)),
      // No one arrangement to read: these are several batches, and the
      // order they were arranged in belongs to each of them separately.
      null,
      await meltingStops()
    ),
    handout: paid.map(withLines),
    unpaid: orders.filter((o) => o.status === "pending").map(withLines),
    items: lines
      .filter((line) => paidIds.has(line.order_id))
      .reduce((sum, line) => sum + line.qty, 0),
    gross: sum(paid, (o) => o.total),
    /* A batch with nothing on it is not one of the day's parts: it has
       no costs to hold, no stage worth watching and nobody on it. The
       empty scheduled run kept turning up beside the car that carried
       the evening. Where nothing is paid for yet they all stand, because
       an empty list says less than a list of empties. */
    parts: (batches.some((one) =>
      paid.some((order) => order.batch_id === one.id)
    )
      ? batches.filter((one) => paid.some((order) => order.batch_id === one.id))
      : batches
    ).map((one) => ({
      id: one.id,
      label: carLabel(one),
      kind: one.kind ?? "run",
      paid: paid.filter((order) => order.batch_id === one.id).length,
      stage: one.stage,
      fuel: one.fuel_cost,
      transport: one.transport_cost ?? 0,
      driver: one.driver_cost,
      other: one.other_cost,
      note: one.cost_note ?? "",
    })),
  };
}

/**
 * Batches with live counts and profit. The default window is the last few days
 * and everything ahead, which is what today needs; "month" reaches back four
 * weeks, to match the dashboard's other figures; "all" reaches back through
 * every run ever made, because a past run is still worth reading.
 */
export async function batchOverview(
  window: "recent" | "month" | "all" = "recent"
): Promise<BatchRow[]> {
  // Parcels are in this list, because the list is what is being driven and a
  // parcel is a trip somebody has to make. They are labelled as parcels and
  // left out of how far ahead the shop is open, which is a question about
  // runs: taking them out of the list altogether meant agreeing a day for one
  // and then having nowhere that said so on the day.
  let query = db().from("batches").select("*");
  if (window === "recent" || window === "month") {
    // Three days for the page that is about this week, twenty-eight for the
    // dashboard, whose other figures are all four weeks: a profit summed
    // over three days sitting beside money taken over four is two questions
    // answered as if they were one.
    const back = window === "month" ? WINDOW_DAYS : 3;
    query = query
      .gte("run_date", new Date(Date.now() - back * 86400000).toISOString().slice(0, 10))
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
    // customer_phone is what commission is worked out from: a promoter is
    // bound to a number, not to an order. Without it every order here looked
    // like nobody's, every run owed nothing, and the dashboard's profit had
    // never once had commission taken off it.
    .select("id, batch_id, status, total, subtotal_food, customer_phone, box_id")
    .in("batch_id", rows.map((b) => b.id))
    .not("status", "in", NOT_ORDERS_SQL);

  const all = (orders ?? []) as Pick<
    Order,
    | "id"
    | "batch_id"
    | "status"
    | "total"
    | "subtotal_food"
    | "customer_phone"
    | "box_id"
  >[];

  // What the counters really charged, where it has been said. Without this
  // the list and the dashboard priced every run at the menu and disagreed
  // with the run's own sheet, which is the one that had been reconciled.
  const extra = await overMenu(rows, all);
  // Per run rather than one total shared out by order count. Sharing was
  // only ever right when every order earned the same for the same person;
  // with four promoters on different rates, and orders that earn nobody
  // anything, a run's share had little to do with what it actually owed.
  //
  // Asked once for the lot rather than once per run. This was a loop with
  // an await in it and `commissionFor` is two queries, so thirty runs in
  // the window meant sixty round trips to London in series before the
  // dashboard could draw anything. `commissionByRun` reads the rule once
  // and tallies in memory, which is what the profit page has always done
  // with the same question.
  const owed = await commissionByRun(
    all.filter((o) => isPaid(o.status)) as Order[]
  );

  return rows.map((b) => {
    const mine = all.filter((o) => o.batch_id === b.id && !isGone(o.status));
    const paid = mine.filter((o) => isPaid(o.status));
    const margin = sum(paid, (o) => o.total - o.subtotal_food);
    const costs = b.fuel_cost + b.driver_cost + (b.transport_cost ?? 0) + b.other_cost;

    return {
      ...b,
      orderCount: mine.length,
      // A parcel's trip carries exactly one order, and that order's page is
      // where the photographs, the day and the stage are.
      //
      // Only when there is exactly one. Nothing puts a second order on a
      // parcel's trip today, but if anything ever did, opening the first and
      // saying nothing about the second is how a bag gets left behind: the
      // sheet lists them all, so that is where two would go.
      ...(b.kind === "parcel" && mine.length === 1 ? { parcelOrderId: mine[0].id } : {}),
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
export async function overMenu(
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

  /*
   * The receipts and the markup list together.
   *
   * Neither needs the other, and they were asked one after the next on the
   * path the dashboard and the runs page both take.
   */
  let spend: { batch_id: string; line_key: string; paid: number; recovered?: number }[] = [];
  const markupsComing = counterMarkups();
  try {
    const { data } = await db()
      .from("counter_spend")
      .select("batch_id, line_key, paid, recovered")
      .in("batch_id", batches.map((b) => b.id));
    spend = (data ?? []) as typeof spend;
  } catch {
    // Still waited on, or the rejection it cannot have lands with nobody
    // holding it and takes the process down.
    await markupsComing.catch(() => ({}));
    return out;
  }

  /*
   * Every run, not only the ones with a receipt typed against them.
   *
   * This used to give up here when nobody had typed anything, leaving the
   * run at a food cost of exactly the menu price and so at no food margin
   * at all. That is almost every run: the figures are typed at a till, by
   * somebody with a bag in one hand, and mostly they are not. The shop's
   * markup was therefore absent from its own profit, which is where tens
   * of thousands of naira of it went.
   */
  const markups = await markupsComing;
  /*
   * A run where somebody typed one figure for the whole shop keeps it.
   *
   * That figure is a real receipt total and beats any reckoning, so it is
   * left alone unless there are per line figures as well, which are better
   * still. Without this guard, opening the window to every run would
   * quietly throw away the one number somebody had actually counted.
   */
  const typedPerLine = new Set(spend.map((row) => String(row.batch_id)));
  const reconciledIds = batches
    .map((b) => String(b.id))
    .filter(
      (id) =>
        typedPerLine.has(id) ||
        Number(batches.find((b) => String(b.id) === id)?.food_spend ?? 0) <= 0
    );
  const wanted = orders.filter(
    (o) => reconciledIds.includes(o.batch_id) && isPaid(o.status)
  );
  const lines = await linesFor(wanted.map((o) => o.id));
  const batchOfOrder = new Map(wanted.map((o) => [o.id, o.batch_id]));
  // What these things really cost, where somebody has written it down, so
  // this agrees with the run's own sheet rather than reckoning the same
  // food two ways on two screens.
  const atCounter = await counterCosts(lines.map((line) => line.menu_item_id));

  for (const id of reconciledIds) {
    const mine = lines.filter((line) => batchOfOrder.get(line.order_id) === id);
    const real = chargedByRestaurant(
      mine,
      spend.filter((row) => row.batch_id === id),
      markups,
      atCounter
    ).reduce(
      (total, place) => total + place.charged,
      0
    );
    // The per line figures win over one figure for the whole shop, which is
    // what the run's own sheet does.
    out.set(id, real - menuOf(id));
  }

  return out;
}

/** What one restaurant's share of a run came to, at the menu and in the end. */
export type CounterCharge = {
  restaurant: string;
  /** The menu value of its lines: what we expected to hand over. */
  menu: number;
  /** What the counter was really charged for those same lines, less anything
   *  handed back, with untyped lines left at the menu price. */
  charged: number;
};

/**
 * The menu value and the real charge of a set of order lines, per restaurant.
 *
 * This is the line-key rule, in one place. A counter line is what somebody
 * reads aloud at the counter, so what was paid for it is recorded against
 * that same key, and a line nobody typed stays at the menu price because the
 * sheet is what was reconciled and silence on a line is not a saving.
 *
 * Both the per-run correction the dashboard takes off and the per-kitchen
 * figures on the profit page are this sum, summed differently. They were a
 * line-key rule and a copy of a line-key rule, which is one rule too many.
 */
export function chargedByRestaurant(
  lines: OrderLine[],
  spend: { line_key: string; paid: number; recovered?: number | null }[],
  /*
   * Each counter's markup, so a line nobody typed a receipt for can be
   * reckoned at what that counter charges rather than at what the customer
   * was charged.
   *
   * Optional, and the old behaviour without it, because this is read in
   * two places and one of them only ever wants the figures somebody really
   * typed. Falling back to the menu price was the bug: the menu price is
   * the cost with the markup already on it, so an unreconciled line
   * claimed the shop handed the counter every naira it took.
   */
  markups: Record<string, number> = {},
  /*
   * What each thing really costs at the counter, by item, where somebody
   * has written it down off a board or a receipt.
   *
   * It beats the markup sum, which is arithmetic rather than knowledge and
   * only ever the guess that stands in until there is one. Passed in
   * rather than read here, because this is a pure function the tests turn
   * over and the costs are one query its callers already have reason to
   * make. Empty is the markup sum, which is how it worked before.
   */
  costs: Map<string, number> = new Map()
): CounterCharge[] {
  const spentOn = new Map(spend.map((row) => [row.line_key, Number(row.paid ?? 0)]));
  const gotBack = new Map(spend.map((row) => [row.line_key, Number(row.recovered ?? 0)]));

  return groupForCounter(lines).map((place) => {
    const markup = markups[place.restaurant];
    return {
      restaurant: place.restaurant,
      menu: place.expectedFoodTotal,
      charged: place.lines.reduce((total, line) => {
        // A receipt somebody typed is the truth. Then a cost somebody
        // wrote down off the board. Then the sum, and only then the menu
        // price, which claims the shop handed the counter every naira it
        // took.
        if (spentOn.has(line.key)) {
          return (
            total + (spentOn.get(line.key) as number) - (gotBack.get(line.key) ?? 0)
          );
        }
        const said = costs.get(line.itemId) ?? 0;
        if (said > 0) return total + said * line.qty;
        return (
          total +
          (markup === undefined
            ? line.qty * line.unitPrice
            : lineCost(line.unitPrice, line.qty, markup))
        );
      }, 0),
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

/**
 * What past runs spent on the fare alone.
 *
 * Only useful beside `typicalCosts`: where the shop has a real fare for
 * tonight's areas, this is the part of the average that figure replaces,
 * and what is left over stands in for the fuel and the driver.
 */
export async function typicalTransport(): Promise<number> {
  try {
    const { data, error } = await db()
      .from("batches")
      .select("transport_cost")
      .eq("stage", "handed_out")
      .order("run_date", { ascending: false })
      .limit(6);
    if (error) return 0;

    const fares = ((data ?? []) as { transport_cost?: number | null }[])
      .map((row) => Number(row.transport_cost ?? 0))
      .filter((one) => one > 0);
    if (fares.length === 0) return 0;
    return Math.round(fares.reduce((sum, one) => sum + one, 0) / fares.length);
  } catch {
    return 0;
  }
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

/**
 * Bags paid for and not yet handed over, on a run that is today.
 *
 * Two small queries rather than a join, because this runs on every admin
 * page: the runs for today, then the paid orders on them. Nought on any
 * trouble at all, since a badge is never worth failing the page it sits on.
 */
async function toHandOverToday(): Promise<number> {
  try {
    const today = lagosToday();

    const { data: runs } = await db()
      .from("batches")
      .select("id")
      .eq("run_date", today);
    const ids = ((runs ?? []) as { id: string }[]).map((one) => one.id);

    // Paid and not yet handed over, counted the two ways the screen counts
    // it: on a run that is today, or placed today for a run still to come.
    // By id rather than by adding two numbers, because an order placed this
    // morning for tonight is both and is one bag.
    const seen = new Set<string>();

    if (ids.length > 0) {
      const { data } = await db()
        .from("orders")
        .select("id")
        .in("batch_id", ids)
        .eq("status", "paid");
      for (const one of (data ?? []) as { id: string }[]) seen.add(one.id);
    }

    const { data: fresh } = await db()
      .from("orders")
      .select("id, created_at")
      .eq("status", "paid")
      // A day either side of Lagos midnight, narrowed properly below: the
      // column is an instant and the day is a Lagos day.
      .gte("created_at", new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString());
    for (const one of (fresh ?? []) as { id: string; created_at: string }[]) {
      const at = new Date(one.created_at);
      if (!Number.isNaN(at.getTime()) && lagosToday(at) === today) seen.add(one.id);
    }

    return seen.size;
  } catch {
    return 0;
  }
}

/**
 * What is waiting, by the section that deals with it.
 *
 * The rail carries a number beside Orders and a dot beside the heading
 * hiding anything else, so the back of the shop says what needs doing from
 * whichever page you are on. Counts only, by the cheapest query that
 * answers them: this runs on every admin page and must never be the reason
 * one is slow.
 *
 * A badge on everything is a badge on nothing, so only the things that cost
 * money if they are left get one: money owed and bags to hand over, carts
 * walked away from, somebody applying, a letter unanswered, something asked
 * for that we do not stock, a parcel still to carry, somebody unhappy this
 * fortnight. Everything else on the menu is a page you go to, not a page
 * that calls you.
 */
export async function waitingCounts(): Promise<Record<string, number>> {
  try {
    /*
     * Eight questions, asked at once.
     *
     * They were asked one after another, each waiting on the last, in the
     * admin layout, on every single navigation. On a laptop beside the
     * database that is nothing; on a phone on mobile data it is eight
     * round trips to Lagos before the screen is allowed to change, which
     * is why the board felt dead and why somebody tapping Runs tapped it
     * three times.
     *
     * Nothing here depends on anything else here, so none of them had any
     * business queuing.
     */
    const since = (days: number) =>
      new Date(Date.now() - days * 86400000).toISOString();

    const [
      unpaid,
      handing,
      left,
      asking,
      post,
      asked,
      carrying,
      unhappy,
      toPutRight,
    ] = await Promise.all([
      // Money owed.
      db().from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      // Today's bags still to go out: the same two things the New in cut
      // counts on its own control. Counting only the unpaid ones here was
      // right while that screen only held unpaid ones, and the day it
      // started holding today's work as well the rail began promising a
      // smaller number than the screen it points at.
      toHandOverToday(),
      // Carts filled in and walked away from. The rail carries this one in
      // the quieter grey: it is work waiting rather than money already
      // owed. The three quarters of an hour is the same wait the carts
      // screen uses before calling one abandoned; the shop can set its own
      // there, and a count on a menu is not worth a second query for the
      // settings row.
      db()
        .from("carts")
        .select("id", { count: "exact", head: true })
        .is("converted_at", null)
        .is("handled_at", null)
        .lt("updated_at", new Date(Date.now() - 45 * 60000).toISOString()),
      // Somebody asking to promote the shop. An application nobody
      // answered is worse than one turned down.
      db()
        .from("promoter_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      // Letters nobody has answered or put aside. Counted on what has been
      // decided rather than on what has been read, because glancing at a
      // letter on a phone is not answering it. Forwarded bank alerts are
      // not letters: one a payment would put a number on the rail that
      // never goes down and means nothing when it moves.
      db()
        .from("mail")
        .select("id", { count: "exact", head: true })
        .is("replied_at", null)
        .is("done_at", null)
        .not("to_addr", "ilike", `%${ALERTS_AT}%`),
      // Somebody asking for something we do not stock.
      db()
        .from("custom_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      // Parcels agreed and not yet handed over. A parcel is never on a run
      // sheet, so until it is delivered the only thing standing between it
      // and being forgotten is this.
      db()
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("parcel_route", "is", null)
        .not("status", "in", NOT_ORDERS_SQL)
        .neq("status", "delivered"),
      // Somebody unhappy, recently. Nothing marks a review as answered, so
      // this one clears itself with the fortnight rather than with a tick:
      // a two star from three weeks ago is not today's job, and a dot that
      // can never go out is a dot nobody reads.
      db()
        .from("orders")
        .select("id", { count: "exact", head: true })
        .lte("rating", 2)
        .gte("rated_at", since(14)),
      // Written at a counter and not yet put right. A sold out item that
      // somebody swapped on the phone leaves the order saying one thing
      // and the evening having been another, and nothing else on the
      // board can know: the only person who saw it was standing at a till
      // and has gone home.
      db()
        .from("run_notes")
        .select("id", { count: "exact", head: true })
        .is("done_at", null),
    ]);

    const out: Record<string, number> = {};
    const put = (href: string, n: number | null | undefined) => {
      if (n && n > 0) out[href] = n;
    };

    put("/admin/orders", (unpaid.count ?? 0) + handing);
    put("/admin/carts", left.count);
    put("/admin/applications", asking.count);
    put("/admin/inbox", post.count);
    put("/admin/requests", asked.count);
    put("/admin/parcels", carrying.count);
    put("/admin/reviews", unhappy.count);
    put("/admin/runs", toPutRight.count);

    return out;
  } catch {
    // A number on a menu is never worth failing a page over.
    return {};
  }
}
