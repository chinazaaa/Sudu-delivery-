import { unstable_cache } from "next/cache";

import { db } from "./supabase";
import { priceLines } from "./orders";
import { getCheckoutLink } from "./checkout-links";
import type { StarterLine } from "./starter-lines";

export { missingFrom } from "./starter-lines";
export type { StarterLine } from "./starter-lines";

/**
 * Ready-made carts.
 *
 * The shop is big and a lot of people open it not knowing what to pick. A
 * starter cart is a cart somebody at the shop already chose, shared as a
 * link or shown on the front page: tap it and the dishes are in your own
 * cart, ready to take things out of, add to, or just pay for.
 *
 * Two promises, and both are kept by where the copy is made. What the
 * visitor changes is changed in their own browser, so one person editing
 * theirs cannot alter what the next sees, and the dishes are priced from
 * the menu every time one is opened, so a starter cannot quote a price the
 * shop no longer charges. The order itself is priced again on the server
 * regardless, like every other cart.
 */

export type Starter = {
  code: string;
  title: string;
  lines: StarterLine[];
  /** What the food comes to, for a tile to say. Delivery is not in it: that
   *  depends on the day, which is the next question. */
  food: number;
};

/** One starter cart, priced from the menu now, or nothing if it is gone. */
export async function starterFor(code: string): Promise<Starter | null> {
  const link = await getCheckoutLink(code);
  // Stopped, or not a starter at all: not this page's business.
  if (!link || !link.active || link.as_cart !== true) return null;

  const priced = await priceLines(link.lines);
  if ("error" in priced) return null;

  const { data: places } = await db()
    .from("restaurants")
    .select("id, name")
    .in("id", [...new Set(priced.lines.map((line) => line.item.restaurant_id))]);
  const named = new Map(
    ((places ?? []) as { id: string; name: string }[]).map((one) => [one.id, one.name])
  );

  const lines: StarterLine[] = priced.lines
    // Something switched off since the cart was made is left out rather than
    // put in a cart it cannot be ordered from.
    .filter((line) => line.item.available !== false)
    .map((line) => ({
      itemId: line.item.id,
      optionIds: line.options.map((one) => one.id),
      name: line.item.name,
      restaurantId: line.item.restaurant_id,
      restaurantName: named.get(line.item.restaurant_id) ?? "",
      imageUrl: line.item.image_url ?? "",
      unitPrice: line.unitPrice,
      choices: line.options.map((one) => one.name),
      choiceFees: line.options.map((one) => one.price_delta),
      qty: line.qty,
      containerPct: line.item.container_pct,
    }));
  if (lines.length === 0) return null;

  return {
    code: link.short ?? link.id,
    title: link.label || "Your cart",
    lines,
    food: lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
  };
}

/** What a tile on the front page says about one. */
export type StarterTile = {
  code: string;
  title: string;
  food: number;
  /** The first few dishes, so a tile says what is in it, not only its name. */
  sample: string[];
  more: number;
};

async function readTiles(): Promise<StarterTile[]> {
  try {
    const { data, error } = await db()
      .from("checkout_links")
      .select("id, short")
      .eq("active", true)
      .eq("as_cart", true)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) return [];

    const found = await Promise.all(
      ((data ?? []) as { id: string; short: string | null }[]).map((row) =>
        starterFor(row.short ?? row.id)
      )
    );
    return found
      .filter((one): one is Starter => one !== null)
      .map((one) => ({
        code: one.code,
        title: one.title,
        food: one.food,
        sample: one.lines.slice(0, 3).map((line) => line.name),
        more: Math.max(0, one.lines.length - 3),
      }));
  } catch {
    // No tiles is the front page as it was, which is the safe way to fail.
    return [];
  }
}

/** Cached for a minute: every visit to the front page asks. */
export const starterTiles = unstable_cache(readTiles, ["starter-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});
