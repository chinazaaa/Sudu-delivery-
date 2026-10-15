import { NextResponse } from "next/server";

import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Enough to choose from without becoming a list to scroll. */
const MOST = 8;

/**
 * What somebody can actually afford, off the real menu.
 *
 * The honest version of "I do not know what to order". It does not
 * recommend: it reads the menu the shop is selling today and shows what
 * the money will buy.
 *
 * Two things it learned the hard way.
 *
 * A budget is not one dish. Forty-five thousand offered the dearest
 * forty-five thousand on the menu, which was a single platter, and that is
 * not what anybody means: they mean enough for the room. So the list is
 * spread across the whole affordable range rather than taken off the top
 * of it, and whatever is picked leaves a figure to keep going with.
 *
 * And not every counter is a restaurant. A fan and a bottle of cooking oil
 * are both on the shop and both cost about what a party platter does, and
 * neither is dinner. Which counters may be suggested is a switch on each
 * one rather than a rule in here, because the shop knows which of its
 * shelves is a kitchen and this file never will.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { spend?: unknown; kitchen?: unknown };

    const spend = Math.round(Number(body.spend ?? 0));
    if (!Number.isFinite(spend) || spend <= 0) {
      return NextResponse.json({ items: [] });
    }
    const kitchen = String(body.kitchen ?? "").trim();

    /*
     * Every open counter, and which of them may be suggested unasked.
     *
     * The two are not the same question. Nobody wants to be offered
     * cooking oil when they said they did not know what to eat, but
     * somebody who has asked for the market is shopping at the market and
     * should be shown what is on it. So the switch decides what is put
     * forward on its own, never what anybody is allowed to buy.
     */
    const { data: shops } = await db()
      .from("restaurants")
      .select("id, name, suggest_in_chat")
      .eq("active", true);
    const open = (shops ?? []) as {
      id: string;
      name: string;
      suggest_in_chat: boolean | null;
    }[];
    if (open.length === 0) return NextResponse.json({ items: [] });

    const named = new Map(open.map((one) => [one.id, one.name]));
    const ids = open
      .filter((one) => one.suggest_in_chat !== false)
      .map((one) => one.id);
    if (kitchen === "" && ids.length === 0) return NextResponse.json({ items: [] });

    /* A floor, because a four hundred naira sachet of water against a ten
       thousand naira budget is a chat that has not understood the
       question. */
    const floor = Math.round(spend * 0.06);

    let query = db()
      .from("menu_items")
      .select("id, name, price_food, restaurant_id")
      .eq("available", true)
      .gt("price_food", 0)
      .lte("price_food", spend)
      .gte("price_food", floor)
      .order("price_food", { ascending: false })
      .limit(160);

    query = kitchen === "" ? query.in("restaurant_id", ids) : query.eq("restaurant_id", kitchen);

    const { data, error } = await query;
    if (error) return NextResponse.json({ items: [] });

    const rows = (data ?? []) as {
      id: string;
      name: string;
      price_food: number;
      restaurant_id: string;
    }[];
    if (rows.length === 0) return NextResponse.json({ items: [] });

    /*
     * Spread, not the top of the list.
     *
     * Taken dearest first, a big budget sees eight of the biggest things
     * on the menu and nothing it can put together. Walked at an even
     * stride down the affordable range instead, the same budget sees a
     * platter, a couple of meals and something to drink, which is an
     * order somebody can actually build.
     */
    const stride = Math.max(1, Math.floor(rows.length / MOST));
    const spread: typeof rows = [];
    const perShop = new Map<string, number>();
    for (let at = 0; at < rows.length && spread.length < MOST; at += stride) {
      const row = rows[at];
      if (kitchen === "") {
        // A list that is all one kitchen has answered a different
        // question, and the car has to stop at each one anyway.
        const many = perShop.get(row.restaurant_id) ?? 0;
        if (many >= 2) continue;
        perShop.set(row.restaurant_id, many + 1);
      }
      spread.push(row);
    }

    return NextResponse.json({
      items: spread.map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price_food),
        shop: named.get(row.restaurant_id) ?? "",
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
