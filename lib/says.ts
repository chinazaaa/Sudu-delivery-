import { db } from "./supabase";
import { googleQuotes, type GoogleQuote } from "./settings";

/**
 * The reviews the site shows, from both places they come from.
 *
 * Two sources, because there are two kinds of review and neither covers the
 * other. A customer who rated their own order is in the orders table with
 * the order they are talking about; somebody who left a review on Google
 * without ever ordering through the site has no order to attach it to, so
 * the shop types that one in.
 *
 * They are one list, in one order, and that is the whole point of this
 * file. Gluing the two sources end to end gave the band an order nobody
 * chose and no way to change: admin showed the order reviews above the
 * typed ones and the site drew the typed one first, so moving a review in
 * admin moved nothing anybody could see. Both kinds now carry the same
 * rank, and the band is simply that list sorted.
 *
 * Nothing from an order appears until it is ticked on that review in admin.
 * Feedback is given in private, to the shop, by somebody answering a
 * question about their dinner, and putting it on the home page because it
 * happened to be five stars publishes a sentence nobody agreed to publish.
 */

/** First name only. Nobody's surname goes on the front page. */
function firstName(said: string): string {
  return said.trim().split(/\s+/)[0] ?? "";
}

/** Where one review came from, so admin knows which row to write back to. */
export type Says = GoogleQuote &
  ({ from: "order"; id: string } | { from: "typed"; at: number });

/** What a button sends back to name one row of a two-source list. */
export function keyOf(one: Says): string {
  return one.from === "order" ? `order:${one.id}` : `typed:${one.at}`;
}

/** The ones a customer left on their own order and the shop ticked. */
export async function saidOnOrders(): Promise<Says[] | null> {
  const { data, error } = await db()
    .from("orders")
    .select(
      "id, customer_name, for_name, deliver_to_name, rating, feedback, rated_at, review_rank"
    )
    .eq("show_review", true)
    .not("rating", "is", null)
    .order("review_rank", { ascending: false })
    .order("rated_at", { ascending: false })
    .limit(40);

  // A column the database has not been given yet, or any other trouble.
  // Null rather than an empty list, so a caller can tell "none ticked"
  // from "could not ask".
  if (error) return null;

  return (data ?? [])
    .map((row: any) => ({
      from: "order" as const,
      id: String(row.id),
      said: String(row.feedback ?? "").trim(),
      /*
       * Whoever ate it, which is not always whoever paid.
       *
       * The stars are tapped on the order page by the person the food
       * went to, and a father ordering for his son was being credited
       * with his son's words: the site printed "Austin" over a review
       * that says we can call you if there is trouble with your order,
       * which is the person who was standing at the hostel.
       */
      who: firstName(
        String(row.deliver_to_name || row.for_name || row.customer_name || "")
      ),
      stars: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))),
      rank: Math.max(0, Math.round(Number(row.review_rank) || 0)),
    }))
    .filter((one) => one.said !== "");
}

/**
 * Both kinds, in the order the band draws them.
 *
 * Ranked first, highest leading. Anything unranked sits under the ranked
 * ones in the order it arrived, which is how a shop that has never touched
 * the order still gets a sensible band.
 */
export async function bandSays(typed: string | null | undefined): Promise<Says[]> {
  const hand: Says[] = googleQuotes(typed).map((one, at) => ({
    ...one,
    from: "typed" as const,
    at,
  }));
  const fromOrders = await saidOnOrders();
  // A band that disappears because of one missing column is worse than a
  // band with fewer cards in it.
  const orders = fromOrders ?? [];

  // The same words from both sources is one review copied across rather
  // than two people saying the same thing, so it is only shown once.
  const seen = new Set(hand.map((one) => one.said.toLowerCase()));
  const both = [
    ...hand,
    ...orders.filter((one) => {
      const key = one.said.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];

  // Stable, so two unranked reviews keep the order they came in.
  return both
    .map((one, at) => ({ one, at }))
    .sort((a, b) => b.one.rank - a.one.rank || a.at - b.at)
    .map((row) => row.one);
}

/** What the band itself needs: the words, nothing about where they live. */
export async function shownSays(
  typed: string | null | undefined
): Promise<GoogleQuote[]> {
  return bandSays(typed);
}
