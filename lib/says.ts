import { db } from "./supabase";
import { googleQuotes, type GoogleQuote } from "./settings";

/**
 * The reviews the site shows, from both places they come from.
 *
 * Two sources, because there are two kinds of review and neither covers the
 * other. A customer who rated their own order is in the orders table with
 * the order they are talking about; somebody who left a review on Google
 * without ever ordering through the site has no order to attach it to, so
 * the shop types that one in. Both end up as the same three things: what
 * was said, who said it, how many stars.
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

/** One ticked review, with the order it belongs to, so admin can move it. */
export type OrderSays = GoogleQuote & { id: string };

/**
 * The ones a customer left on their own order and the shop ticked.
 *
 * Ranked first, newest second. The rank is zero on everything until
 * somebody moves one to the front, so out of the box this is still simply
 * newest first.
 */
export async function saidOnOrders(): Promise<OrderSays[] | null> {
  const { data, error } = await db()
    .from("orders")
    .select("id, customer_name, for_name, rating, feedback, rated_at, review_rank")
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
      id: String(row.id),
      said: String(row.feedback ?? "").trim(),
      who: firstName(String(row.for_name || row.customer_name || "")),
      stars: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))),
    }))
    .filter((one) => one.said !== "");
}

export async function shownSays(typed: string | null | undefined): Promise<GoogleQuote[]> {
  const hand = googleQuotes(typed);
  const fromOrders = await saidOnOrders();
  // A band that disappears because of one missing column is worse than a
  // band with fewer cards in it.
  if (fromOrders === null) return hand;

  // Typed first, because those are the ones chosen for the front page. The
  // same words from both sources is one review copied across rather than
  // two people saying the same thing, so it is only shown once.
  const seen = new Set(hand.map((one) => one.said.toLowerCase()));
  return [
    ...hand,
    ...fromOrders.filter((one) => {
      const key = one.said.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}
