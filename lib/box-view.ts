import { db } from "./supabase";
import { priceLines, type PricedLine } from "./orders";
import { openBatches } from "./batches";
import { deliverySlots, slotsWorthOffering, type Slot } from "./same-day";
import { hoursByDay, safeSettings } from "./settings";
import { runDateLabel } from "./time";
import { SLOT_LABEL } from "./config";
import { cartOf, isTimed, type Box, type BoxLine, type Occasion } from "./boxes";

/** How far ahead a box looks. A games night really is planned a fortnight
 *  out, which is further than the shop offers for an ordinary dinner. */
export const BOX_DAYS = 14;

/**
 * One way of getting a box here, with what it costs that way.
 *
 * A run and a car of its own are the same food at two prices, and the
 * difference is worth seeing side by side: most people will take the run
 * and save the money, which is what the shop wants anyway.
 */
export type WhenOption = {
  /** What a form sends back to say which one they picked. */
  key: string;
  runId: string;
  at: string;
  date: string;
  /** "Saturday, 26 Sept" */
  day: string;
  /** "between 12pm and 3pm" */
  window: string;
  onARun: boolean;
  fee: number;
};

export type BoxLineView = {
  id: string;
  name: string;
  restaurant: string;
  choices: string[];
  qty: number;
  total: number;
  /** Three at most, chosen by the shop. Not the menu: the moment a box can
   *  be anything it is a menu again. */
  swaps: { name: string; restaurant: string; choices: string[]; delta: number }[];
};

export type BoxView = {
  id: string;
  name: string;
  blurb: string;
  serves: string;
  imageUrl: string;
  isExtra: boolean;
  lines: BoxLineView[];
  /** What the food comes to as the shop packed it. A swap moves it by its
   *  own delta, which the page can do without asking the server again. */
  food: number;
  runFee: number;
  carFee: number;
};

/**
 * A box drawn out, priced off the menu as it is right now.
 *
 * Never off a number somebody typed when the box was made. A Domino's price
 * rise in October would otherwise have the shop selling at a loss without
 * anybody noticing.
 */
export async function boxView(box: Box): Promise<BoxView | null> {
  return (await boxViews([box]))[0] ?? null;
}

/**
 * Several boxes at once.
 *
 * One occasion is three boxes and each box used to cost three round trips
 * to a database in London, which is nine on a page that draws three cards.
 * Every box on a page is priced off the same menu, so they are asked for
 * together and cut apart here.
 */
export async function boxViews(boxes: Box[]): Promise<BoxView[]> {
  if (boxes.length === 0) return [];

  const asked = boxes.map((box) => {
    const wanted = cartOf(box);
    const swapCarts = box.lines.flatMap((line) =>
      line.swaps.map((swap) => ({
        menu_item_id: swap.menu_item_id,
        option_ids: swap.option_ids,
        qty: 1,
      }))
    );
    return { box, wanted, swapCarts };
  });

  const priced = await priceLines(asked.flatMap((one) => [...one.wanted, ...one.swapCarts]));
  if ("error" in priced) return [];

  const names = await restaurantNames(
    priced.lines.map((one) => one.item.restaurant_id)
  );

  const views: BoxView[] = [];
  let cursor = 0;
  for (const { box, wanted, swapCarts } of asked) {
    const packed = priced.lines.slice(cursor, cursor + wanted.length);
    cursor += wanted.length;
    const swapped = priced.lines.slice(cursor, cursor + swapCarts.length);
    cursor += swapCarts.length;

    const view = one(box, packed, swapped, names);
    if (view) views.push(view);
  }
  return views;
}

function one(
  box: Box,
  packed: PricedLine[],
  swapped: PricedLine[],
  names: Map<string, string>
): BoxView | null {
  let at = 0;
  const lines: BoxLineView[] = box.lines.map((line, index) => {
    const here = packed[index];
    const mine = swapped.slice(at, at + line.swaps.length);
    at += line.swaps.length;

    return {
      id: line.id,
      name: here.item.name,
      restaurant: names.get(here.item.restaurant_id) ?? "",
      choices: here.options.map((one) => one.name),
      qty: line.qty,
      total: here.unitPrice * line.qty,
      swaps: mine.map((one) => ({
        name: one.item.name,
        restaurant: names.get(one.item.restaurant_id) ?? "",
        choices: one.options.map((option) => option.name),
        // Per unit and times the quantity, because swapping one of two
        // pizzas swaps both: a box is one decision, not a per-slice one.
        delta: (one.unitPrice - here.unitPrice) * line.qty,
      })),
    };
  });

  return {
    id: box.id,
    name: box.name,
    blurb: box.blurb,
    serves: box.serves,
    imageUrl: box.image_url,
    isExtra: box.is_extra,
    lines,
    food: lines.reduce((sum, line) => sum + line.total, 0),
    runFee: box.run_fee,
    carFee: box.car_fee,
  };
}

async function restaurantNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data } = await db().from("restaurants").select("id, name").in("id", unique);
  return new Map((data ?? []).map((row: any) => [row.id as string, row.name as string]));
}

/**
 * Every way this box could get to them, soonest first.
 *
 * Only things the shop has actually agreed to: runs that exist, and a car of
 * its own on a day it has hours for. Offering a Tuesday nobody is going to
 * drive is worse than not mentioning Tuesday.
 *
 * A timed occasion narrows this to one row and then to none, because a match
 * has a whistle and nothing after it is any use.
 */
export async function whenOptions(
  occasion: Occasion,
  box: Box,
  now: Date = new Date()
): Promise<WhenOption[]> {
  const settings = await safeSettings();

  // Far enough to reach the thing itself. A fortnight is right for a games
  // night nobody has dated yet, and wrong for a match three weeks out that
  // already has a run under it: the horizon would hide the very car the
  // occasion was pinned to.
  const days = isTimed(occasion)
    ? Math.max(
        BOX_DAYS,
        Math.ceil(
          (new Date(occasion.happens_at ?? "").getTime() - now.getTime()) / 86_400_000
        ) + 1
      )
    : BOX_DAYS;

  const runs = (await openBatches(days)).filter((one) => !one.full);
  const slots =
    (settings.same_day_on || "") === "on"
      ? slotsWorthOffering(
          deliverySlots(now, await hoursByDay(), days),
          runs.map((one) => ({
            run_date: one.run_date,
            window: one.delivery_window_text,
          }))
        )
      : [];

  const onRuns: WhenOption[] = runs.map((run) => ({
    key: `run:${run.id}`,
    runId: run.id,
    at: "",
    date: run.run_date,
    day: runDateLabel(run.run_date),
    window: run.delivery_window_text || SLOT_LABEL[run.slot],
    onARun: true,
    fee: box.run_fee,
  }));

  const inCars: WhenOption[] = slots.map((slot: Slot) => ({
    key: `car:${slot.at}`,
    runId: "",
    at: slot.at,
    date: slot.date,
    day: runDateLabel(slot.date),
    window: slot.window,
    onARun: false,
    fee: box.car_fee,
  }));

  if (!isTimed(occasion)) {
    return [...onRuns, ...inCars].sort(byWhen);
  }

  // A time everybody shares. Before the cut-off it rides the run the shop
  // put the occasion on. After that, a car of its own for as long as one
  // could still land before the whistle. Then nothing, said plainly.
  const happens = new Date(occasion.happens_at ?? "").getTime();
  const closes = new Date(occasion.closes_at ?? "").getTime();

  if (Number.isFinite(closes) && now.getTime() < closes) {
    const pinned = onRuns.find((one) => one.runId === occasion.batch_id);
    if (pinned) return [pinned];
  }

  return Number.isFinite(happens)
    ? inCars.filter((one) => new Date(one.at).getTime() <= happens)
    : [];
}

const byWhen = (a: WhenOption, b: WhenOption): number =>
  (a.date === b.date ? (a.onARun ? -1 : 1) : a.date < b.date ? -1 : 1);

/**
 * What the cheapest box on each occasion comes to, delivery in.
 *
 * The list page lives or dies on this number. "Games night" is a category;
 * "Games night, from ₦32,900 with delivery" is an offer, and the difference
 * is whether anybody taps.
 *
 * Worked out in two queries for the whole page rather than by pricing every
 * box properly, because a list does not need swaps, restaurants or choices,
 * and asking for them would put a round trip on every card.
 */
export async function cheapestBoxes(
  boxes: { id: string; occasion_id: string; run_fee: number; is_extra: boolean; lines: BoxLine[] }[]
): Promise<Map<string, number>> {
  const meals = boxes.filter((one) => !one.is_extra && one.lines.length > 0);
  if (meals.length === 0) return new Map();

  const itemIds = [...new Set(meals.flatMap((b) => b.lines.map((l) => l.menu_item_id)))];
  const optionIds = [...new Set(meals.flatMap((b) => b.lines.flatMap((l) => l.option_ids)))];

  const [items, options] = await Promise.all([
    db().from("menu_items").select("id, price_food, available").in("id", itemIds),
    optionIds.length > 0
      ? db().from("item_options").select("id, price_delta").in("id", optionIds)
      : Promise.resolve({ data: [] as { id: string; price_delta: number }[] }),
  ]);

  const price = new Map(
    (items.data ?? []).map((row: any) => [row.id as string, Number(row.price_food ?? 0)])
  );
  const gone = new Set(
    (items.data ?? []).filter((row: any) => row.available === false).map((row: any) => row.id as string)
  );
  const delta = new Map(
    (options.data ?? []).map((row: any) => [row.id as string, Number(row.price_delta ?? 0)])
  );

  const cheapest = new Map<string, number>();
  for (const box of meals) {
    // A box with something off the menu in it is not a price anybody can be
    // quoted, so it is left out of the "from" rather than quoted wrong.
    if (box.lines.some((line) => gone.has(line.menu_item_id) || !price.has(line.menu_item_id))) {
      continue;
    }

    const food = box.lines.reduce(
      (sum, line) =>
        sum +
        line.qty *
          ((price.get(line.menu_item_id) ?? 0) +
            line.option_ids.reduce((on: number, id: string) => on + (delta.get(id) ?? 0), 0)),
      0
    );

    const total = food + box.run_fee;
    const now = cheapest.get(box.occasion_id);
    if (now === undefined || total < now) cheapest.set(box.occasion_id, total);
  }
  return cheapest;
}
