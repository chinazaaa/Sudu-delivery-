import { NextResponse } from "next/server";

import { db } from "@/lib/supabase";
import { openRestaurants } from "@/lib/menu";

export const dynamic = "force-dynamic";

/** Enough to choose from without becoming a list to scroll. */
const MOST = 8;

/**
 * What somebody can actually afford, off the real menu.
 *
 * The honest version of "I do not know what to order". It does not
 * recommend: it reads the menu the shop is selling from today, keeps what
 * fits the money, and puts the dearest of those first, because somebody
 * with ten thousand to spend wants the best ten thousand will buy rather
 * than the cheapest thing on the shelf.
 *
 * Every price here is the menu's own, which is the same price the till
 * charges. Nothing is made up, nothing is a sample, and a dish that goes
 * off the menu this afternoon stops being suggested this afternoon.
 *
 * A floor as well as a ceiling, because a budget of ten thousand offered a
 * four hundred naira sachet of water is a chat that has not understood the
 * question. Half the budget is a reasonable thing to be shown; a fortieth
 * of it is not.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { spend?: unknown; kitchen?: unknown };

    const spend = Math.round(Number(body.spend ?? 0));
    if (!Number.isFinite(spend) || spend <= 0) {
      return NextResponse.json({ items: [] });
    }
    const kitchen = String(body.kitchen ?? "").trim();

    // Only counters that are open today, so nothing is offered from a
    // kitchen the car is not going to.
    const open = await openRestaurants().catch(() => []);
    const ids = open.map((one) => one.id);
    if (ids.length === 0) return NextResponse.json({ items: [] });

    const named = new Map(open.map((one) => [one.id, one.name]));
    const floor = Math.round(spend * 0.35);

    let query = db()
      .from("menu_items")
      .select("id, name, price_food, restaurant_id")
      .eq("available", true)
      .gt("price_food", 0)
      .lte("price_food", spend)
      .gte("price_food", floor)
      .order("price_food", { ascending: false })
      .limit(MOST * 3);

    query = kitchen === "" ? query.in("restaurant_id", ids) : query.eq("restaurant_id", kitchen);

    const { data, error } = await query;
    if (error) return NextResponse.json({ items: [] });

    const rows = (data ?? []) as {
      id: string;
      name: string;
      price_food: number;
      restaurant_id: string;
    }[];

    // Spread across counters rather than eight things from whichever
    // kitchen happens to price highest. A list that is all Domino's is a
    // list that has answered a different question.
    const seen = new Map<string, number>();
    const items = rows
      .filter((row) => {
        if (kitchen !== "") return true;
        const many = seen.get(row.restaurant_id) ?? 0;
        if (many >= 2) return false;
        seen.set(row.restaurant_id, many + 1);
        return true;
      })
      .slice(0, MOST)
      .map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price_food),
        shop: named.get(row.restaurant_id) ?? "",
      }));

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
