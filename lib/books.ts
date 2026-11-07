import * as counter from "./counter";
import { COUNTERS } from "./counter";
import type { Settings } from "./settings";
import type { Batch } from "./types";
import type { Band } from "./fees";

/**
 * The bookstore: the same shelf machinery, carried in from the UK.
 *
 * Skincare and the pharmacy are a weekly car around Lagos. This one is
 * not: the whole offer is that these books are not in the country, so the
 * stock is flown in on a single trip and the shelf lands on one date
 * somebody types rather than on a weekday that comes round again.
 *
 * That is the only difference, and the counter module holds it as
 * `onOneDate`. Everything else here is the bookstore's name on the shelf,
 * the basket, the ladder and the drop that all three counters share.
 */

const BOOKS = COUNTERS.books;

export type BookProduct = counter.CounterProduct;
export type Browse = counter.Browse;

export const PER_PAGE = counter.PER_PAGE;
export const PROMISE = BOOKS.defaultPromise;

export const cutOffTime = counter.cutOffTime;
export const dropLabel = counter.dropLabel;
export const bandsFor = counter.bandsFor;
export const bookProduct = counter.counterProduct;

export function bookBands(settings: Settings): Band[] {
  return counter.counterBands(BOOKS, settings);
}

export function bookFee(settings: Settings, items: number): number {
  return counter.counterFee(BOOKS, settings, items);
}

export function bookPromise(settings: Settings): string {
  return counter.counterPromise(BOOKS, settings);
}

/**
 * Whether the shelf is open.
 *
 * Switched on in admin like the others, and then only while there is a
 * date on it: a bookstore with no arrival is a page promising books that
 * are not coming, which is worse than no page.
 */
export function booksOn(settings: Settings): boolean {
  if (!counter.counterOn(BOOKS, settings)) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(settings.books_date ?? "").trim());
}

export function nextDrop(
  settings: Settings,
  now: Date = new Date()
): { date: string; cutOff: string } {
  return counter.nextDrop(BOOKS, settings, now);
}

export function dropBatch(
  settings: Settings,
  now: Date = new Date()
): Promise<Batch | null> {
  return counter.dropBatch(BOOKS, settings, now);
}

export function bookShop(): Promise<{ id: string; name: string } | null> {
  return counter.counterShop(BOOKS);
}

export function bookFacets(): Promise<counter.Facets> {
  return counter.counterFacets(BOOKS);
}

export function browseBooks(
  options: Browse
): Promise<{ products: BookProduct[]; total: number }> {
  return counter.browseCounter(BOOKS, options);
}

export function isBooks(ref: string): Promise<boolean> {
  return counter.isCounter(BOOKS, ref);
}

export function booksIn(itemIds: string[]): Promise<boolean> {
  return counter.counterIn(BOOKS, itemIds);
}

export function bookShelves(): Promise<
  { id: string; name: string; items: number; filed: number }[]
> {
  return counter.counterShelves(BOOKS);
}
