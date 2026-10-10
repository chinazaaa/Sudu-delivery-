import { db } from "./supabase";
import { naira } from "./money";
import { dayLabel } from "./time";

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
  /** Nothing is nudged to this number until this moment has passed. */
  quiet_until: string | null;
  /** The number does not work, so nothing is ever nudged to it again. */
  bad_number: boolean;
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

/** How long "not interested" lasts, in days. A fortnight, as the board says. */
export const QUIET_DAYS = 14;

/** The moment a fortnight of quiet ends, counted from now. */
export function quietUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + QUIET_DAYS * 86_400_000).toISOString();
}

/**
 * Numbers nobody is to be nudged on, worked out from the marks on their
 * carts.
 *
 * By phone rather than by cart, because that is what the two promises are
 * about: somebody who said they were not interested on Tuesday has not
 * changed their mind because they filled another cart on Thursday, and a
 * number that does not ring does not start ringing because a different run
 * came round. One cart of theirs carrying either mark is enough to leave
 * every cart of theirs alone.
 *
 * A fortnight that has run out is not quiet any more, which is the whole
 * point of its being a date and not a flag: nothing has to run at night to
 * put anybody back on the list.
 */
export function hushedPhones(
  rows: { phone: string; quiet_until: string | null; bad_number: boolean }[],
  now: Date = new Date()
): Set<string> {
  const hushed = new Set<string>();
  for (const row of rows) {
    if (row.bad_number) {
      hushed.add(row.phone);
      continue;
    }
    const until = row.quiet_until ? new Date(row.quiet_until).getTime() : NaN;
    if (Number.isFinite(until) && until > now.getTime()) hushed.add(row.phone);
  }
  return hushed;
}

/**
 * Every cart carrying either mark, which is a handful of rows out of all of
 * them.
 *
 * Two plain queries rather than one with an either/or in it. The marks are
 * read on every pass over the abandoned carts, and the cost of a filter
 * this layer gets subtly wrong is a promise that quietly stops being kept:
 * two conditions nobody can misread are worth the second round trip.
 */
async function markedCarts(): Promise<SavedCart[]> {
  const [bad, quiet] = await Promise.all([
    db().from("carts").select("*").eq("bad_number", true).limit(500),
    db().from("carts").select("*").not("quiet_until", "is", null).limit(500),
  ]);

  const rows = new Map<string, SavedCart>();
  for (const row of [
    ...((bad.data ?? []) as SavedCart[]),
    ...((quiet.data ?? []) as SavedCart[]),
  ]) {
    rows.set(row.id, row);
  }
  // Newest decision first, so the list of numbers being left alone reads
  // down from the one that was just made.
  return [...rows.values()].sort((a, b) =>
    (b.handled_at ?? b.updated_at).localeCompare(a.handled_at ?? a.updated_at)
  );
}

/**
 * Carts left untouched for long enough to count as abandoned. A cart is only
 * abandoned once: it is left alone if it converted, if it was already handled,
 * or if the run it belonged to has closed.
 *
 * And it is left alone if its number is not to be nudged. Two of the reasons
 * a cart gets closed promise exactly that, so the promise is kept here rather
 * than on any one page: the dashboard's left behind figure, the card that
 * offers to nudge everybody, the nightly recap and the chase list on the
 * carts page all read this one function, and all four follow from it.
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

  const [{ data, error }, marked] = await Promise.all([query, markedCarts()]);
  if (error) throw new Error(error.message);
  const hushed = hushedPhones(marked);
  return ((data ?? []) as SavedCart[]).filter(
    (cart) => !hushed.has(cart.phone)
  );
}

/**
 * The numbers being left alone, one row each, newest decision first.
 *
 * Drawn on the carts page, because that is where somebody wonders why a
 * person they remember never appears on the list any more. A promise that
 * quietly removes people is only honest if it can be seen and undone.
 */
export async function hushedCarts(): Promise<SavedCart[]> {
  const marked = await markedCarts();
  const hushed = hushedPhones(marked);
  const seen = new Set<string>();
  return marked.filter((cart) => {
    if (!hushed.has(cart.phone) || seen.has(cart.phone)) return false;
    seen.add(cart.phone);
    return true;
  });
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

/**
 * Puts a number back in the nudging, however it came out of it.
 *
 * There has to be a way back. The commonest reason a number is marked wrong
 * is that it was typed wrong, and the person who typed it is the person who
 * finds out: a digit short, a nudge that never arrives, and a cart that will
 * never appear on the list again because of it.
 *
 * Both marks go at once, and across every cart that number has, because
 * that is how they are read. Clearing one cart's would leave the rule in
 * place wherever the other copy of it sat.
 */
export async function freeNumber(cartId: string): Promise<string> {
  const { data } = await db()
    .from("carts")
    .select("phone")
    .eq("id", cartId)
    .maybeSingle();
  const phone = ((data?.phone as string | undefined) ?? "").trim();
  if (phone === "") return "";

  await db()
    .from("carts")
    .update({ quiet_until: null, bad_number: false })
    .eq("phone", phone);
  return phone;
}

/**
 * Why a number is being left alone, in the words the page prints, and empty
 * when it is not being left alone at all.
 *
 * A date rather than "for two weeks", because the fortnight started whenever
 * somebody closed that cart and nobody remembers when that was.
 */
export function hushNote(
  cart: { quiet_until: string | null; bad_number: boolean },
  now: Date = new Date()
): string {
  if (cart.bad_number) return "Number marked wrong";
  const until = cart.quiet_until ? new Date(cart.quiet_until).getTime() : NaN;
  if (Number.isFinite(until) && until > now.getTime()) {
    return `Quiet until ${dayLabel(cart.quiet_until as string)}`;
  }
  return "";
}
