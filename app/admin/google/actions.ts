"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { getSettings, googleQuotes, type GoogleQuote } from "@/lib/settings";
import { bandSays, keyOf } from "@/lib/says";

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

function read(form: FormData, rank: number): GoogleQuote {
  return {
    said: String(form.get("said") ?? "").trim(),
    who: String(form.get("who") ?? "").trim(),
    stars: Math.min(5, Math.max(1, Math.round(Number(form.get("stars")) || 5))),
    rank,
  };
}

/** One above everything on the band, so a new review leads it. */
async function topRank(): Promise<number> {
  const shown = await bandSays((await getSettings()).google_quotes);
  return shown.reduce((most, one) => Math.max(most, one.rank), 0) + 1;
}

/** A new one leads the band, which is where somebody adding it is looking. */
export async function addQuote(form: FormData): Promise<void> {
  await assertAdmin();
  const one = read(form, await topRank());
  if (one.said === "") return;
  await writeQuotes([one, ...(await current())]);
}

export async function saveQuote(form: FormData): Promise<void> {
  await assertAdmin();
  const at = Number(form.get("at"));
  const quotes = await current();
  if (!Number.isInteger(at) || at < 0 || at >= quotes.length) return;

  // Editing the words is not moving it, so it keeps the place it had.
  const one = read(form, quotes[at].rank);
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
 * Move one review up or down the band, or straight to the front.
 *
 * One list, both kinds. They used to be reordered separately, which could
 * not work: the band is one row and the two halves were glued end to end,
 * so moving a review within its half moved nothing anybody could see.
 *
 * Every row is renumbered from the list on screen on every move, highest
 * first. More writes than swapping a pair, and the only version that cannot
 * drift: ranks start at zero on everything, so until something is moved
 * there is no pair to swap, and a half-ranked list sorts in an order
 * nobody chose.
 */
async function reorder(
  key: string,
  place: (at: number, many: number) => number
): Promise<void> {
  const settings = await getSettings();
  const shown = await bandSays(settings.google_quotes);
  if (shown.length < 2) return;

  const at = shown.findIndex((one) => keyOf(one) === key);
  if (at < 0) return;

  const to = Math.max(0, Math.min(shown.length - 1, place(at, shown.length)));
  if (to === at) return;

  const moved = [...shown];
  const [one] = moved.splice(at, 1);
  moved.splice(to, 0, one);

  const ranked = moved.map((row, index) => ({ row, rank: moved.length - index }));

  // The typed ones go back as one column, in their new order and carrying
  // their new ranks.
  const quotes: GoogleQuote[] = ranked
    .filter((entry) => entry.row.from === "typed")
    .map((entry) => ({
      said: entry.row.said,
      who: entry.row.who,
      stars: entry.row.stars,
      rank: entry.rank,
    }));
  await writeQuotes(quotes);

  for (const entry of ranked) {
    if (entry.row.from !== "order") continue;
    const { error } = await db()
      .from("orders")
      .update({ review_rank: entry.rank })
      .eq("id", entry.row.id);
    if (error) throw new Error(`Could not save that: ${error.message}`);
  }

  revalidatePath("/admin/google");
  revalidatePath("/", "layout");
}

export async function raiseSay(form: FormData): Promise<void> {
  await assertAdmin();
  await reorder(String(form.get("key") ?? ""), (at) => at - 1);
}

export async function lowerSay(form: FormData): Promise<void> {
  await assertAdmin();
  await reorder(String(form.get("key") ?? ""), (at) => at + 1);
}

export async function leadWith(form: FormData): Promise<void> {
  await assertAdmin();
  await reorder(String(form.get("key") ?? ""), () => 0);
}
