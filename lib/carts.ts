import { db } from "./supabase";
import { naira } from "./money";

export type SavedCart = {
  id: string;
  phone: string;
  name: string;
  hostel: string;
  batch_id: string | null;
  items: number;
  value: number;
  summary: string;
  converted_at: string | null;
  alerted_at: string | null;
  handled_at: string | null;
  handled_reason: string;
  created_at: string;
  updated_at: string;
};

/**
 * Keeps a cart as it stood at checkout. It is written only once a phone number
 * has been typed, because a cart with nobody attached to it cannot be followed
 * up and is not worth storing.
 */
export async function rememberCart(cart: {
  phone: string;
  name: string;
  hostel: string;
  batchId: string | null;
  items: number;
  value: number;
  summary: string;
}): Promise<void> {
  if (!cart.phone || cart.items === 0) return;

  await db().from("carts").upsert(
    {
      phone: cart.phone,
      name: cart.name,
      hostel: cart.hostel,
      batch_id: cart.batchId,
      items: cart.items,
      value: cart.value,
      summary: cart.summary,
      // Touching a cart again clears any previous alert, so a person who comes
      // back and leaves again is chased once more rather than never.
      converted_at: null,
      alerted_at: null,
      handled_at: null,
      handled_reason: "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone,batch_id" }
  );
}

/** Marks a cart as bought, so nobody is chased for an order they placed. */
export async function cartConverted(phone: string, batchId: string): Promise<void> {
  await db()
    .from("carts")
    .update({ converted_at: new Date().toISOString() })
    .eq("phone", phone)
    .eq("batch_id", batchId);
}

/**
 * Carts left untouched for long enough to count as abandoned. A cart is only
 * abandoned once: it is left alone if it converted, if it was already handled,
 * or if the run it belonged to has closed.
 */
export async function abandonedCarts(
  minutes: number,
  onlyUnalerted = false
): Promise<SavedCart[]> {
  const cutoff = new Date(Date.now() - minutes * 60000).toISOString();

  let query = db()
    .from("carts")
    .select("*")
    .is("converted_at", null)
    .is("handled_at", null)
    .lt("updated_at", cutoff)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (onlyUnalerted) query = query.is("alerted_at", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SavedCart[];
}

/** Carts already dealt with, newest first, so a decision can be undone. */
export async function closedCarts(limit = 100): Promise<SavedCart[]> {
  const { data, error } = await db()
    .from("carts")
    .select("*")
    .not("handled_at", "is", null)
    .order("handled_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SavedCart[];
}

export async function markAlerted(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db()
    .from("carts")
    .update({ alerted_at: new Date().toISOString() })
    .in("id", ids);
}

/** One line per cart, for an email or a list. */
export function cartLine(cart: SavedCart): string {
  return (
    `${cart.name || "Someone"} ${cart.phone} · ${naira(cart.value)} · ` +
    `${cart.items} item${cart.items === 1 ? "" : "s"}: ${cart.summary}`
  );
}
