"use client";

/**
 * How somebody found their way to the food in their cart.
 *
 * "picker: Pizza" when they chose it through the front page picker, "starter
 * cart" when a shared cart link filled their basket. Kept in the browser
 * until the order is placed, then written on the order so the shop can see
 * which new ways of ordering are being used. A label for the shop to read:
 * nothing is priced or decided by it.
 */
const KEY = "sudu_via";
/** Half a day: a tag from this morning is not why they ordered tonight. */
const FRESH = 12 * 60 * 60 * 1000;

export function setVia(tag: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ tag, at: Date.now() }));
  } catch {
    /* No storage, no tag. The order is unaffected. */
  }
}

export function readVia(): string {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as
      | { tag?: string; at?: number }
      | null;
    if (!saved?.tag || !saved.at || Date.now() - saved.at > FRESH) return "";
    return String(saved.tag).slice(0, 60);
  } catch {
    return "";
  }
}

export function clearVia(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
