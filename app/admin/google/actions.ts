"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { getSettings, googleQuotes, type GoogleQuote } from "@/lib/settings";

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

/** One place up the page, so the best one can be made to lead. */
export async function raiseQuote(form: FormData): Promise<void> {
  await assertAdmin();
  const at = Number(form.get("at"));
  const quotes = await current();
  if (!Number.isInteger(at) || at < 1 || at >= quotes.length) return;

  const moved = [...quotes];
  [moved[at - 1], moved[at]] = [moved[at], moved[at - 1]];
  await writeQuotes(moved);
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
