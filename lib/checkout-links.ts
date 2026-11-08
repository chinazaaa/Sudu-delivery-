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
  /** Other dishes somebody can have off this link instead of what it came
   *  with. One basket either way: picking one swaps it in. */
  alternatives: CartLine[];
  /** A card link, so paying by card needs no message. */
  payment_link: string;
  /**
   * Opens as a starter cart rather than a fixed checkout.
   *
   * The dishes go into the visitor's own cart and they can take things
   * out, add more and carry on shopping. What they change is changed in
   * their own browser: nothing here is written to by a visitor, so one
   * person editing it cannot change what the next person sees.
   */
  as_cart?: boolean;
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
  if (!data) return null;
  // A database that has not had the column yet simply offers nothing else.
  return { ...(data as CheckoutLink), alternatives: (data.alternatives ?? []) as CartLine[] };
}

export async function saveCheckoutLink(args: {
  id?: string;
  label: string;
  lines: CartLine[];
  alternatives: CartLine[];
  batchId: string | null;
  deliverAt: string | null;
  /** Null leaves delivery to the ordinary rules. */
  fee: number | null;
  couponCode: string | null;
  paymentLink: string;
  note: string;
  /** A starter cart, which has no fee, run, coupon or card link of its own:
   *  all of that is decided at the checkout the visitor ends up on. */
  asCart?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (args.lines.length === 0) {
    return { ok: false, error: "Put something in it first." };
  }

  /*
   * A starter cart leaves the checkout's own settings empty, whatever was
   * left in the form. Its fee, run, coupon and card link belong to a
   * fixed checkout it never opens, and a stale fee sitting on a cart
   * somebody switched over would be a figure nothing ever reads.
   */
  const asCart = args.asCart === true;
  const row = {
    label: args.label.slice(0, 80),
    lines: args.lines,
    alternatives: asCart ? [] : args.alternatives,
    batch_id: asCart ? null : args.batchId,
    deliver_at: asCart ? null : args.deliverAt,
    fee: asCart ? null : args.fee,
    coupon_code: asCart ? null : args.couponCode?.trim() || null,
    payment_link: asCart ? "" : args.paymentLink.trim().slice(0, 500),
    note: args.note.trim().slice(0, 300),
    as_cart: asCart,
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
