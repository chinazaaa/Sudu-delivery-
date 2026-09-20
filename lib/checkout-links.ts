import { db } from "./supabase";
import { lookupColumn } from "./links";
import type { CartLine } from "./types";

/**
 * A basket somebody made by hand, ready to send.
 *
 * "I am going to Domino's, the meatball pizza is on offer, here is a link."
 * Whoever taps it says who they are and where it goes, and that is the order.
 *
 * The food is fixed by whoever made the link. The price is not: prices and
 * promotions live on the menu, and a link that carried its own figures would
 * quietly disagree with the shop the moment anything changed.
 */
export type CheckoutLink = {
  id: string;
  short: string | null;
  label: string;
  lines: CartLine[];
  /** The run it goes on, or null for whichever is taking orders when they
   *  tap it, which is what a link sent to a group chat wants. */
  batch_id: string | null;
  /** Or a time, which makes its own car when somebody orders, exactly as a
   *  same day order does. */
  deliver_at: string | null;
  /** What delivery costs on this one, when it is not what the ladder would
   *  say. Null leaves the ordinary rules, promotions and all. */
  fee: number | null;
  coupon_code: string | null;
  /** A card link, so paying by card needs no message. */
  payment_link: string;
  note: string;
  active: boolean;
  used: number;
  created_at: string;
};

/** Every link, newest first. Admin reads this; nobody else does. */
export async function listCheckoutLinks(): Promise<CheckoutLink[]> {
  const { data, error } = await db()
    .from("checkout_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return [];
  return (data ?? []) as CheckoutLink[];
}

/** One link, by its short code or its long id: every link ever sent works. */
export async function getCheckoutLink(code: string): Promise<CheckoutLink | null> {
  if (!code) return null;
  const { data, error } = await db()
    .from("checkout_links")
    .select("*")
    .eq(lookupColumn(code), code)
    .maybeSingle();
  if (error) return null;
  return (data as CheckoutLink) ?? null;
}

export async function saveCheckoutLink(args: {
  id?: string;
  label: string;
  lines: CartLine[];
  batchId: string | null;
  deliverAt: string | null;
  /** Null leaves delivery to the ordinary rules. */
  fee: number | null;
  couponCode: string | null;
  paymentLink: string;
  note: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (args.lines.length === 0) {
    return { ok: false, error: "Put something in it first." };
  }

  const row = {
    label: args.label.slice(0, 80),
    lines: args.lines,
    batch_id: args.batchId,
    deliver_at: args.deliverAt,
    fee: args.fee,
    coupon_code: args.couponCode?.trim() || null,
    payment_link: args.paymentLink.trim().slice(0, 500),
    note: args.note.trim().slice(0, 300),
  };

  if (args.id) {
    const { error } = await db().from("checkout_links").update(row).eq("id", args.id);
    return error ? { ok: false, error: error.message } : { ok: true, id: args.id };
  }

  const { data, error } = await db()
    .from("checkout_links")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save that." };
  return { ok: true, id: data.id as string };
}

/** Switched off rather than deleted: a link already sent should say it has
 *  been stopped, not turn into a page that never existed. */
export async function setCheckoutLinkActive(id: string, active: boolean): Promise<void> {
  await db().from("checkout_links").update({ active }).eq("id", id);
}

export async function deleteCheckoutLink(id: string): Promise<void> {
  await db().from("checkout_links").delete().eq("id", id);
}

/** One more order came out of it. Counted for the admin's sake alone. */
export async function countCheckoutLinkUse(id: string): Promise<void> {
  const { data } = await db().from("checkout_links").select("used").eq("id", id).maybeSingle();
  await db()
    .from("checkout_links")
    .update({ used: ((data?.used as number) ?? 0) + 1 })
    .eq("id", id);
}
