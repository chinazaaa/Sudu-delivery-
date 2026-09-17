import { unstable_cache } from "next/cache";
import { db } from "./supabase";

/** How far back "this week" reaches, and how many items the row shows. */
const DAYS = 14;
const SHOWN = 12;

/**
 * What people are actually buying.
 *
 * Counted from paid orders only, because an order nobody paid for is not
 * evidence of anything. Two weeks rather than seven days: a run happens three
 * or four times a week, so a strict week can come down to a couple of runs and
 * one big group order decides the whole list.
 *
 * Quantities are added rather than orders counted, so ten people putting one
 * wrap each in a group order says what it should.
 */
async function readPopular(days = DAYS, limit = SHOWN): Promise<string[]> {
  try {
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const { data: orders, error: ordersError } = await db()
      .from("orders")
      .select("id")
      .in("status", ["paid", "delivered"])
      .gte("created_at", since);
    if (ordersError) throw new Error(ordersError.message);

    const ids = (orders ?? []).map((row) => (row as { id: string }).id);
    if (ids.length === 0) return [];

    const { data: lines, error: linesError } = await db()
      .from("order_items")
      .select("menu_item_id, qty")
      .in("order_id", ids);
    if (linesError) throw new Error(linesError.message);

    const sold = new Map<string, number>();
    for (const line of (lines ?? []) as { menu_item_id: string; qty: number }[]) {
      sold.set(line.menu_item_id, (sold.get(line.menu_item_id) ?? 0) + line.qty);
    }

    return [...sold.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  } catch {
    // Nothing sold yet, or the read failed. The home page falls back to
    // showing a few things from each menu instead of an empty row.
    return [];
  }
}


/**
 * Held for five minutes. Working this out reads every paid order and every
 * line on them, which only grows, and what is popular does not change between
 * one visitor and the next.
 */
export const popularItemIds = unstable_cache(readPopular, ["popular-items"], {
  revalidate: 300,
  tags: ["orders"],
});
