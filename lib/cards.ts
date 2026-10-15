import { db } from "./supabase";
import { safeSettings } from "./settings";

/**
 * The handwritten card that goes in the box.
 *
 * One product, not three. A birthday card and a thank you card are the same
 * piece of paper with different words on it, and the words are the thing
 * the person writing them chooses. Stocking three of them would mean three
 * prices to keep in step, three things to run out of, and a menu that looks
 * like it is padding.
 *
 * So the chat calls it whatever the occasion makes it -- a birthday card, a
 * thank you card -- and the shop sells one card. The name on the bill and
 * on the run sheet is the product's own, because that is what somebody has
 * to go and pick up.
 *
 * Which product it is, is a setting rather than a name in the code. Nothing
 * here knows what a card is called, and a shop that renames it or raises
 * its price does so in one place like everything else.
 */
export type Card = {
  id: string;
  /** The product's own name, for the bill and the run sheet. */
  name: string;
  price: number;
};

export async function cardOnOffer(): Promise<Card | null> {
  try {
    const settings = await safeSettings();
    const id = String(settings.card_item_id ?? "").trim();
    if (id === "") return null;

    const { data, error } = await db()
      .from("menu_items")
      .select("id, name, price_food, available")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as { id: string; name: string; price_food: number; available: boolean };
    // Off the menu is off the menu. A card nobody can buy must not be
    // offered in the chat either, or somebody says yes to a thing that is
    // not there.
    if (!row.available || Number(row.price_food) <= 0) return null;

    return { id: row.id, name: row.name, price: Number(row.price_food) };
  } catch {
    // No setting, no column, no card. The chat simply does not offer one.
    return null;
  }
}

/** What to call it in the conversation, given what the order is for. */
export function cardCalled(occasion: string): string {
  if (occasion === "birthday") return "birthday card";
  if (occasion === "thanks") return "thank you card";
  if (occasion === "gift" || occasion === "parent") return "gift card";
  return "card";
}
