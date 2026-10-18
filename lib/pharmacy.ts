import * as counter from "./counter";
import { COUNTERS } from "./counter";
import type { Settings } from "./settings";
import type { Batch } from "./types";
import type { Band } from "./fees";

/**
 * The pharmacy counter: a shop of its own, on the car's day.
 *
 * Everything here is the counter module wearing the pharmacy's name, in
 * the same shape the skincare shelf uses, for the same reason: eight
 * hundred packets of paracetamol have no business in a food menu, and a
 * basket holding a pizza and a bottle of cough syrup cannot be one
 * delivery because they do not go in the same car.
 *
 * What is not here is anything that decides what a person should take.
 * We fetch and we carry. The page says so in as many words, and the terms
 * say it at greater length.
 */

const PHARMACY = COUNTERS.pharmacy;

export type PharmacyProduct = counter.CounterProduct;
export type Browse = counter.Browse;

export const PER_PAGE = counter.PER_PAGE;
export const PROMISE = PHARMACY.defaultPromise;

export const cutOffTime = counter.cutOffTime;
export const dropLabel = counter.dropLabel;
export const pharmacyProduct = counter.counterProduct;

export function pharmacyBands(settings: Settings): Band[] {
  return counter.counterBands(PHARMACY, settings);
}

export function pharmacyFee(settings: Settings, items: number): number {
  return counter.counterFee(PHARMACY, settings, items);
}

export function pharmacyPromise(settings: Settings): string {
  return counter.counterPromise(PHARMACY, settings);
}

export function pharmacyOn(settings: Settings): boolean {
  return counter.counterOn(PHARMACY, settings);
}

export function pharmacyBlurb(settings: Settings): string {
  return counter.counterBlurb(PHARMACY, settings);
}

export function pharmacyCutOff(settings: Settings): string {
  return counter.counterCutOff(PHARMACY, settings);
}

export function nextDrop(
  settings: Settings,
  now: Date = new Date()
): { date: string; cutOff: string } {
  return counter.nextDrop(PHARMACY, settings, now);
}

export function dropBatch(
  settings: Settings,
  now: Date = new Date()
): Promise<Batch | null> {
  return counter.dropBatch(PHARMACY, settings, now);
}

export function pharmacyShop(): Promise<{ id: string; name: string } | null> {
  return counter.counterShop(PHARMACY);
}

export function pharmacyFacets(): Promise<counter.Facets> {
  return counter.counterFacets(PHARMACY);
}

export function browsePharmacy(
  options: Browse
): Promise<{ products: PharmacyProduct[]; total: number }> {
  return counter.browseCounter(PHARMACY, options);
}

export function isPharmacy(ref: string): Promise<boolean> {
  return counter.isCounter(PHARMACY, ref);
}

export function pharmacyIn(itemIds: string[]): Promise<boolean> {
  return counter.counterIn(PHARMACY, itemIds);
}

export function pharmacyShelves(): Promise<
  { id: string; name: string; items: number; filed: number }[]
> {
  return counter.counterShelves(PHARMACY);
}
