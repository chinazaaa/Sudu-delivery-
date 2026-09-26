import { db } from "./supabase";
import { safeSettings } from "./settings";
import { activeBands, sameDayPricing } from "./settings";
import { parseAreas, dearestArea, areasIn, canGoSameDay, withExtra, HOME, type Area } from "./areas";
import type { Band } from "./fees";
import { parseValueBands, type ValueBand } from "./value-bands";

/**
 * Where every restaurant is, read once.
 *
 * A map rather than a column on the cart: the cart is written in a browser
 * and a browser can say anything, so where a kitchen is has to be looked up
 * at the moment the money is decided.
 */
export async function areaOfEach(): Promise<Record<string, string>> {
  const { data, error } = await db().from("restaurants").select("id, area");
  // Before the migration there is no column, and asking for one errors the
  // whole statement. Everything is home then, which is what it was.
  if (error) return {};
  return Object.fromEntries(
    ((data ?? []) as { id: string; area?: string }[]).map((one) => [one.id, one.area ?? ""])
  );
}

export async function allAreas(): Promise<Area[]> {
  return parseAreas((await safeSettings()).delivery_areas);
}

export type CartArea = {
  /** The one that prices the order: the furthest thing in the cart. */
  dearest: Area;
  /** Every area the cart touches, for saying which run can carry it. */
  all: Area[];
  /** Whether a car of its own can go at all. */
  sameDay: boolean;
  /** The two ladders as this cart is charged them. */
  bands: Band[];
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

  return {
    valueBands: await valueLadder(restaurantIds),
    byValueKitchens: await kitchensByValue(restaurantIds),
    dearest,
    all,
    sameDay: canGoSameDay(all),
    bands: withExtra(base, dearest.runExtra),
    sameDayBands: withExtra(sameDay.bands, dearest.sameDayExtra),
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

  const { data, error } = await db()
    .from("restaurants")
    .select("id, value_bands")
    .in("id", restaurantIds);
  // Before the migration there is no column, and every restaurant is on the
  // ordinary ladder, which is what they were all on anyway.
  if (error) return [];

  const ladders = ((data ?? []) as { value_bands?: string }[])
    .map((one) => parseValueBands(one.value_bands))
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

  const { data, error } = await db()
    .from("restaurants")
    .select("id, value_bands")
    .in("id", restaurantIds);
  // Before the migration there is no column, and nobody prices by value.
  if (error) return [];

  return ((data ?? []) as { id: string; value_bands?: string }[])
    .filter((one) => parseValueBands(one.value_bands).length > 0)
    .map((one) => one.id);
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
export async function valueBandsOfEach(): Promise<Record<string, ValueBand[]>> {
  const { data, error } = await db().from("restaurants").select("id, value_bands");
  if (error) return {};

  const found: Record<string, ValueBand[]> = {};
  for (const one of ((data ?? []) as { id: string; value_bands?: string }[])) {
    const bands = parseValueBands(one.value_bands);
    if (bands.length > 0) found[one.id] = bands;
  }
  return found;
}

