import { cache } from "react";

import { db } from "./supabase";
import { safeSettings } from "./settings";
import { activeBands, sameDayPricing } from "./settings";
import {
  parseAreas,
  parseAreaPairs,
  dearestArea,
  areasIn,
  canGoSameDay,
  withExtra,
  mixedExtra,
  HOME,
  type Area,
  type AreaPair,
} from "./areas";
import type { Band } from "./fees";
import { parseValueBands, type ValueBand } from "./value-bands";
import { parseStepFee, type StepFee } from "./step-fee";

/**
 * Where every restaurant is, read once.
 *
 * A map rather than a column on the cart: the cart is written in a browser
 * and a browser can say anything, so where a kitchen is has to be looked up
 * at the moment the money is decided.
 *
 * Once per request, not once per asking. Pricing a cart asks for this, and
 * so does saying which run can carry it, and so does the checkout drawing
 * the fee again: one table that changes when somebody moves a kitchen,
 * fetched one time and handed to all of them.
 */
export const areaOfEach = cache(async function areaOfEach(): Promise<Record<string, string>> {
  const { data, error } = await db().from("restaurants").select("id, area");
  // Before the migration there is no column, and asking for one errors the
  // whole statement. Everything is home then, which is what it was.
  if (error) return {};
  return Object.fromEntries(
    ((data ?? []) as { id: string; area?: string }[]).map((one) => [one.id, one.area ?? ""])
  );
});

export async function allAreas(): Promise<Area[]> {
  return parseAreas((await safeSettings()).delivery_areas);
}

/** What a stop between any two of them costs, as the shop has priced it. */
export async function allAreaPairs(): Promise<AreaPair[]> {
  return parseAreaPairs((await safeSettings()).area_pairs);
}

export type CartArea = {
  /** The one that prices the order: the furthest thing in the cart. */
  dearest: Area;
  /** Every area the cart touches, for saying which run can carry it. */
  all: Area[];
  /** Whether a car of its own can go at all. */
  sameDay: boolean;
  /** What the second and any further area in this cart add, on top of the
   *  dearest one's extra. Nought on a cart that is one detour. */
  mixedExtra: number;
  /** The two ladders as this cart is charged them: the shop's own, with
   *  the distance and the stops already added to every rung. */
  bands: Band[];
  /** The same ladder before any of that, for the one sum that adds the
   *  extra itself. A market half is priced off what the shopping comes to
   *  and a restaurant half off how much room it takes, and the trip is one
   *  trip: charging it inside the restaurant half and again on the total
   *  charges a mixed cart twice for one car. */
  baseBands: Band[];
  sameDayBands: Band[];
  urgentExtra: number;
  /** Where a kitchen prices by what the shopping comes to rather than by how
   *  many things it is, its ladder. Empty is the ordinary one. */
  valueBands: ValueBand[];
  /** Which kitchens in this cart price that way, so the market half of a
   *  mixed cart can be told from the restaurant half. */
  byValueKitchens: string[];
};

/**
 * What this cart costs to deliver, and what it is allowed to go on.
 *
 * One place, asked on the server, so the number on the checkout and the
 * number on the bill come from the same sentence rather than from two
 * readings of the same rule.
 */
export async function areaOfCart(restaurantIds: string[]): Promise<CartArea> {
  const [areas, where, base, sameDay] = await Promise.all([
    allAreas(),
    areaOfEach(),
    activeBands(),
    sameDayPricing(),
  ]);

  const all = areasIn(areas, restaurantIds, where);
  const dearest = dearestArea(areas, restaurantIds, where);
  // The dearest area sets the distance. A second one is a second stop, and
  // what a stop is worth depends on which two places it is between, which
  // is a table somebody fills in rather than a number in the code.
  const mixed = mixedExtra(all, parseAreaPairs((await safeSettings()).area_pairs));

  return {
    valueBands: await valueLadder(restaurantIds),
    byValueKitchens: await kitchensByValue(restaurantIds),
    dearest,
    all,
    sameDay: canGoSameDay(all),
    mixedExtra: mixed,
    bands: withExtra(base, dearest.runExtra + mixed),
    baseBands: base,
    sameDayBands: withExtra(sameDay.bands, dearest.sameDayExtra + mixed),
    urgentExtra: sameDay.urgentExtra,
  };
}

/** The areas of a set of restaurants, without the ladders. */
export async function areasOfCart(restaurantIds: string[]): Promise<Area[]> {
  const [areas, where] = await Promise.all([allAreas(), areaOfEach()]);
  return areasIn(areas, restaurantIds, where);
}

export { HOME };

/**
 * The value ladder this cart is priced by, if any kitchen in it has one.
 *
 * Dearest wins where two do, for the same reason the area does: one car
 * fetches all of it, and the harder half of the trip is what it costs.
 */
export async function valueLadder(restaurantIds: string[]): Promise<ValueBand[]> {
  if (restaurantIds.length === 0) return [];

  // The one map of who prices how, rather than a query of its own. This and
  // the next function asked the database the same question twice, and
  // pricing one cart calls both.
  const byId = await valueBandsOfEach();

  const ladders = restaurantIds
    .map((id) => byId[id] ?? [])
    .filter((one) => one.length > 0);

  return ladders.reduce<ValueBand[]>(
    (worst, one) => (top(one) > top(worst) ? one : worst),
    []
  );
}

const top = (bands: ValueBand[]) => bands[bands.length - 1]?.fee ?? 0;

/**
 * Which kitchens in this cart price by what the shopping comes to.
 *
 * Asked of the database rather than of the cart, for the same reason the
 * ladder is: a phone saying "this is all market shopping" is a phone asking
 * for the cheaper fee.
 */
export async function kitchensByValue(restaurantIds: string[]): Promise<string[]> {
  if (restaurantIds.length === 0) return [];

  const byId = await valueBandsOfEach();
  return restaurantIds.filter((id) => (byId[id] ?? []).length > 0);
}

/**
 * Every kitchen that prices by what the shopping comes to, by id.
 *
 * Sent to the browser rather than worked out there: where a kitchen is and
 * how it charges are facts about the shop, and a cart written on a phone
 * cannot be trusted with either. The browser only picks which of them
 * applies to what is in front of it, and the server decides it again when
 * the order is placed.
 */
export const valueBandsOfEach = cache(async function valueBandsOfEach(): Promise<
  Record<string, ValueBand[]>
> {
  const { data, error } = await db().from("restaurants").select("id, value_bands");
  if (error) return {};

  const found: Record<string, ValueBand[]> = {};
  for (const one of ((data ?? []) as { id: string; value_bands?: string }[])) {
    const bands = parseValueBands(one.value_bands);
    if (bands.length > 0) found[one.id] = bands;
  }
  return found;
});


/**
 * The days each restaurant opens, for the ones that do not open every day.
 *
 * Only the exceptions are returned, so a shop where nothing ever closes
 * sends an empty object and the checkout behaves exactly as it always has.
 */
export const openDaysOfEach = cache(async function openDaysOfEach(): Promise<
  Record<string, string>
> {
  const { data, error } = await db().from("restaurants").select("id, name, open_days");
  if (error) return {};

  const found: Record<string, string> = {};
  for (const one of (data ?? []) as { id: string; open_days?: string }[]) {
    const said = (one.open_days ?? "").trim();
    if (said !== "") found[one.id] = said;
  }
  return found;
});

/**
 * Everything priced by the cool box rather than by the container, by item.
 *
 * On the item and not the restaurant, because Fantasy ice cream sits in
 * Sudu Shop beside kettles, bedsheets and a bouquet of roses: hung off the
 * shop, the rule would have priced a mattress protector by the cool box.
 *
 * Read on the server and sent down, the same way the value ladders are, and
 * for the same reason: how a thing is charged for is a fact about the shop,
 * and a cart written on a phone cannot be trusted with it. The browser only
 * picks which of them applies to what is in front of it, and the server
 * decides it again when the order is placed.
 *
 * Only the handful that have one, so this stays a few rows however many
 * thousand things the shop sells.
 */
export const stepFeeOfEach = cache(async function stepFeeOfEach(): Promise<
  Record<string, StepFee>
> {
  const { data, error } = await db()
    .from("menu_items")
    .select("id, step_fee")
    .neq("step_fee", "");
  // Before the migration there is no column, and nothing is priced this way.
  if (error) return {};

  const found: Record<string, StepFee> = {};
  for (const one of (data ?? []) as { id: string; step_fee?: string }[]) {
    const steps = parseStepFee(one.step_fee);
    if (steps) found[one.id] = steps;
  }
  return found;
});
