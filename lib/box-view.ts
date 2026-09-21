import { db } from "./supabase";
import { priceLines } from "./orders";
import { openBatches } from "./batches";
import { deliverySlots, slotsWorthOffering, type Slot } from "./same-day";
import { hoursByDay, safeSettings } from "./settings";
import { runDateLabel } from "./time";
import { SLOT_LABEL } from "./config";
import { cartOf, isTimed, type Box, type Occasion } from "./boxes";

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
  const wanted = cartOf(box);
  const swapCarts = box.lines.flatMap((line) =>
    line.swaps.map((swap) => ({
      menu_item_id: swap.menu_item_id,
      option_ids: swap.option_ids,
      qty: 1,
    }))
  );

  // Everything in one go: the box as packed, and every alternative, so the
  // page can price a swap without a round trip.
  const priced = await priceLines([...wanted, ...swapCarts]);
  if ("error" in priced) return null;

  const names = await restaurantNames(
    priced.lines.map((one) => one.item.restaurant_id)
  );

  const packed = priced.lines.slice(0, wanted.length);
  const swapped = priced.lines.slice(wanted.length);

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

  const runs = (await openBatches(BOX_DAYS)).filter((one) => !one.full);
  const slots =
    (settings.same_day_on || "") === "on"
      ? slotsWorthOffering(
          deliverySlots(now, await hoursByDay(), BOX_DAYS),
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
    window: slot.phrase.replace(/ (today|tomorrow|.*)$/, "") || slot.phrase,
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
