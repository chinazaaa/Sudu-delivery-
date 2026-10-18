import * as counter from "./counter";
import { COUNTERS } from "./counter";
import type { Settings } from "./settings";
import type { Batch } from "./types";
import type { Band } from "./fees";

/**
 * Skincare: the same shop, a different delivery day.
 *
 * All of this used to live here, and then the pharmacy wanted the same
 * thing: its own basket, its own car, its own day. The day, the car, the
 * shelf and the ladder moved into the counter module, and what is left
 * here is skincare's name on them.
 *
 * Kept as its own file rather than changed at every call site, because
 * twenty-two pages import these names and a rename across all of them
 * would be a large diff saying nothing. A page that only ever shows
 * skincare should go on asking for skincare.
 */

const SKINCARE = COUNTERS.skincare;

export type SkincareProduct = counter.CounterProduct;
export type Browse = counter.Browse;

export const PER_PAGE = counter.PER_PAGE;
export const PROMISE = SKINCARE.defaultPromise;

export const cutOffTime = counter.cutOffTime;
export const dropLabel = counter.dropLabel;
export const bandsFor = counter.bandsFor;
export const skincareProduct = counter.counterProduct;

export function skincareBands(settings: Settings): Band[] {
  return counter.counterBands(SKINCARE, settings);
}

export function skincareFee(settings: Settings, items: number): number {
  return counter.counterFee(SKINCARE, settings, items);
}

export function skincarePromise(settings: Settings): string {
  return counter.counterPromise(SKINCARE, settings);
}

export function skincareOn(settings: Settings): boolean {
  return counter.counterOn(SKINCARE, settings);
}

export function nextDrop(
  settings: Settings,
  now: Date = new Date()
): { date: string; cutOff: string } {
  return counter.nextDrop(SKINCARE, settings, now);
}

export function dropBatch(
  settings: Settings,
  now: Date = new Date()
): Promise<Batch | null> {
  return counter.dropBatch(SKINCARE, settings, now);
}

export function skincareShop(): Promise<{ id: string; name: string } | null> {
  return counter.counterShop(SKINCARE);
}

export function skincareFacets(): Promise<counter.Facets> {
  return counter.counterFacets(SKINCARE);
}

export function browseSkincare(
  options: Browse
): Promise<{ products: SkincareProduct[]; total: number }> {
  return counter.browseCounter(SKINCARE, options);
}

export function isSkincare(ref: string): Promise<boolean> {
  return counter.isCounter(SKINCARE, ref);
}

export function skincareIn(itemIds: string[]): Promise<boolean> {
  return counter.counterIn(SKINCARE, itemIds);
}

export function skincareShelves(): Promise<
  { id: string; name: string; items: number; filed: number }[]
> {
  return counter.counterShelves(SKINCARE);
}

/**
 * Whether this order belongs to a counter rather than an ordinary run.
 *
 * It asks about every counter, not only skincare, despite the name: the
 * thing it is used for is wording that would otherwise say food, and a
 * pharmacy order is no more food than a cleanser is. The name stayed
 * because a dozen pages read well with it.
 */
export const isSkincareBatch = counter.isCounterBatch;
