"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { getSettings, googleQuotes, type GoogleQuote } from "@/lib/settings";
import { saidOnOrders } from "@/lib/says";

async function assertAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

/**
 * The reviews, written back.
 *
 * One column holding a list rather than a table of its own: they are a
 * handful of sentences the shop copies off its own profile once in a while,
 * they are read on every page load with the rest of the settings, and a
 * table would be a join for something that is never queried.
 */
async function writeQuotes(quotes: GoogleQuote[]): Promise<void> {
  const { error } = await db()
    .from("settings")
    .update({
      google_quotes: quotes.length > 0 ? JSON.stringify(quotes) : "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(`Could not save that: ${error.message}`);

  revalidatePath("/admin/google");
  revalidatePath("/", "layout");
}

async function current(): Promise<GoogleQuote[]> {
  return googleQuotes((await getSettings()).google_quotes);
}

function read(form: FormData): GoogleQuote {
  return {
    said: String(form.get("said") ?? "").trim(),
    who: String(form.get("who") ?? "").trim(),
    stars: Math.min(5, Math.max(1, Math.round(Number(form.get("stars")) || 5))),
  };
}

/** Newest at the top, which is the order they are read in. */
export async function addQuote(form: FormData): Promise<void> {
  await assertAdmin();
  const one = read(form);
  if (one.said === "") return;
  await writeQuotes([one, ...(await current())]);
}

export async function saveQuote(form: FormData): Promise<void> {
  await assertAdmin();
  const at = Number(form.get("at"));
  const quotes = await current();
  if (!Number.isInteger(at) || at < 0 || at >= quotes.length) return;

  const one = read(form);
  // Emptying the words is how a review is deleted from its own row, which
  // is what somebody who cleared the box meant.
  if (one.said === "") {
    await writeQuotes(quotes.filter((_, index) => index !== at));
    return;
  }
  await writeQuotes(quotes.map((was, index) => (index === at ? one : was)));
}

export async function removeQuote(form: FormData): Promise<void> {
  await assertAdmin();
  const at = Number(form.get("at"));
  const quotes = await current();
  if (!Number.isInteger(at) || at < 0 || at >= quotes.length) return;
  await writeQuotes(quotes.filter((_, index) => index !== at));
}

/** One place either way, so the list can be put in the order you want. */
async function shuffle(at: number, by: 1 | -1): Promise<void> {
  const quotes = await current();
  const to = at + by;
  if (!Number.isInteger(at) || at < 0 || at >= quotes.length) return;
  if (to < 0 || to >= quotes.length) return;

  const moved = [...quotes];
  [moved[to], moved[at]] = [moved[at], moved[to]];
  await writeQuotes(moved);
}

export async function raiseQuote(form: FormData): Promise<void> {
  await assertAdmin();
  await shuffle(Number(form.get("at")), -1);
}

export async function lowerQuote(form: FormData): Promise<void> {
  await assertAdmin();
  await shuffle(Number(form.get("at")), 1);
}

/**
 * The score itself: what the profile says today.
 *
 * Typed rather than fetched. The Places API charges per call and a rating
 * that moves by a tenth is not worth a request on every page view.
 */
export async function saveScore(form: FormData): Promise<void> {
  await assertAdmin();

  const rating = Math.min(5, Math.max(0, Number(form.get("google_rating")) || 0));
  const count = Math.max(0, Math.round(Number(form.get("google_reviews")) || 0));

  const { error } = await db()
    .from("settings")
    .update({
      google_rating: rating,
      google_reviews: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw new Error(`Could not save that: ${error.message}`);

  revalidatePath("/admin/google");
  revalidatePath("/", "layout");
}

/**
 * Move one order review up or down the band, or straight to the front.
 *
 * The ranks are rewritten from the order on screen every time, highest
 * first. That is more writes than swapping two rows, and it is the only
 * version that cannot drift: ranks start at zero on everything, so there
 * is no pair to swap until something has been moved, and half-ranked
 * lists sort in an order nobody chose.
 */
async function reorder(id: string, place: (at: number, many: number) => number): Promise<void> {
  const shown = await saidOnOrders();
  if (shown === null || shown.length < 2) return;

  const at = shown.findIndex((one) => one.id === id);
  if (at < 0) return;

  const to = Math.max(0, Math.min(shown.length - 1, place(at, shown.length)));
  if (to === at) return;

  const moved = [...shown];
  const [one] = moved.splice(at, 1);
  moved.splice(to, 0, one);

  // Highest first, and every row written, so the list on screen and the
  // list in the database are the same list.
  for (let index = 0; index < moved.length; index += 1) {
    const { error } = await db()
      .from("orders")
      .update({ review_rank: moved.length - index })
      .eq("id", moved[index].id);
    if (error) throw new Error(`Could not save that: ${error.message}`);
  }

  revalidatePath("/admin/google");
  revalidatePath("/", "layout");
}

export async function raiseOrderReview(form: FormData): Promise<void> {
  await assertAdmin();
  await reorder(String(form.get("id") ?? ""), (at) => at - 1);
}

export async function lowerOrderReview(form: FormData): Promise<void> {
  await assertAdmin();
  await reorder(String(form.get("id") ?? ""), (at) => at + 1);
}

export async function leadWith(form: FormData): Promise<void> {
  await assertAdmin();
  await reorder(String(form.get("id") ?? ""), () => 0);
}
