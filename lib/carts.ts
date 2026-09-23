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
/** How long after an order a cart save still counts as that order's tail. */
const JUST_ORDERED = 30 * 60_000;

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

  // An order clears the cart in the browser, but a save can still be in
  // flight when it does, and this used to blank the conversion on its way
  // past. So somebody who had just ordered appeared on the chase list two
  // seconds later, with the exact food they had paid for.
  //
  // A save straight after an order is the tail of that order. A save an hour
  // later is a new cart, and that one should be chased like any other, so
  // the conversion is kept only while it is recent.
  const { data: before } = await db()
    .from("carts")
    .select("converted_at")
    .eq("phone", cart.phone)
    .eq("batch_id", cart.batchId)
    .maybeSingle();

  const converted = (before?.converted_at as string | null) ?? null;
  const fresh =
    converted !== null &&
    Date.now() - new Date(converted).getTime() < JUST_ORDERED;

  await db().from("carts").upsert(
    {
      phone: cart.phone,
      name: cart.name,
      hostel: cart.hostel,
      batch_id: cart.batchId,
      items: cart.items,
      value: cart.value,
      summary: cart.summary,
      converted_at: fresh ? converted : null,
      // Touching a cart again clears any previous alert, so a person who comes
      // back and leaves again is chased once more rather than never.
      alerted_at: fresh ? undefined : null,
      handled_at: fresh ? undefined : null,
      handled_reason: fresh ? undefined : "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone,batch_id" }
  );
}

/**
 * Marks a cart as bought, so nobody is chased for an order they placed.
 *
 * Every open cart of theirs, not only the one on this run. A cart is saved
 * against whatever run was current while they browsed, and the checkout can
 * move them to another one: a car of its own makes a run of its own, and a
 * cart holding something from Lekki is moved to the run that goes there. The
 * old cart was then left behind for an order that had just been placed.
 */
export async function cartConverted(phone: string, batchId: string): Promise<void> {
  const now = new Date().toISOString();
  await db().from("carts").update({ converted_at: now }).eq("phone", phone).eq("batch_id", batchId);
  // Anything else of theirs still open. They have ordered; nothing of theirs
  // is abandoned.
  await db()
    .from("carts")
    .update({ converted_at: now })
    .eq("phone", phone)
    .is("converted_at", null)
    .is("handled_at", null);
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
