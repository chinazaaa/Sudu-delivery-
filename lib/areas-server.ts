import { db } from "./supabase";
import { safeSettings } from "./settings";
import { activeBands, sameDayPricing } from "./settings";
import { parseAreas, dearestArea, areasIn, canGoSameDay, withExtra, HOME, type Area } from "./areas";
import type { Band } from "./fees";

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
