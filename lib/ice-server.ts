import { cache } from "react";

import { db } from "./supabase";
import { safeSettings } from "./settings";
import { itemsNeedingIce } from "./areas-server";

/**
 * The bag of ice block as a cart needs it, and what has to travel on it.
 *
 * Read in one place so the cart, the checkout and the order all mean the
 * same bag at the same price. Null where the shop has not said which item
 * it is, and then nothing is ever added: a missing setting must never be
 * the thing that changes what somebody is charged.
 */
export type IceForCart = {
  itemId: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string;
  unitPrice: number;
  containerPct: number;
};

export const iceForCart = cache(async function iceForCart(): Promise<{
  ice: IceForCart | null;
  needsIce: string[];
}> {
  try {
    const wanted = [...(await itemsNeedingIce())];
    const id = ((await safeSettings()).ice_item_id ?? "").trim();
    if (id === "" || wanted.length === 0) return { ice: null, needsIce: wanted };

    const { data, error } = await db()
      .from("menu_items")
      .select(
        "id, name, price_food, image_url, container_pct, restaurant_id, restaurants(name)"
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return { ice: null, needsIce: wanted };

    const row = data as unknown as {
      id: string;
      name: string;
      price_food: number;
      image_url?: string | null;
      container_pct?: number | null;
      restaurant_id: string;
      restaurants?: { name?: string } | null;
    };

    return {
      ice: {
        itemId: row.id,
        name: row.name,
        restaurantId: row.restaurant_id,
        restaurantName: row.restaurants?.name ?? "",
        imageUrl: row.image_url ?? "",
        unitPrice: Math.round(Number(row.price_food ?? 0)),
        /* Room in the car, as the shop set it. A bag of ice is the
           shop's answer to a problem the order created rather than
           another thing somebody asked for, so it is usually set to take
           no room: letting it count would push a three item order onto
           the four item rung and charge two thousand of delivery for a
           bag costing twelve fifty. */
        containerPct: Number(row.container_pct ?? 0),
      },
      needsIce: wanted,
    };
  } catch {
    return { ice: null, needsIce: [] };
  }
});
