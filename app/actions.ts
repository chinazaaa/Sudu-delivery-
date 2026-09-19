"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrder, moveOrder, placeOrder, previewCoupon, saveRating } from "@/lib/orders";
import { lastOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { rememberCart } from "@/lib/carts";
import { db } from "@/lib/supabase";
import { closeGroup, markDone } from "@/lib/groups";
import {
  checkPin,
  currentCustomer,
  customerDetails,
  signInCustomer,
  signOutCustomer,
} from "@/lib/customer-auth";
import type { CartLine } from "@/lib/types";

export type SubmitState = { error: string | null };

/** The cart as the browser posted it: ids and quantities, never prices. */
function parseCart(value: FormDataEntryValue | null): CartLine[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

export async function submitOrder(
  _prev: SubmitState,
  form: FormData
): Promise<SubmitState> {
  const lines = parseCart(form.get("cart"));
  if (lines.length === 0) {
    return { error: "Something went wrong with your cart. Please rebuild it." };
  }

  const mode = String(form.get("group_mode") ?? "");

  // In a shared delivery nobody checks out at all. The food is finalised on
  // the group page and becomes an order when the group closes, which is the
  // first moment there is a delivery fee to put on it. Anybody who lands here
  // while in one is sent back to where the decision actually is.
  const inGroup = (await cookies()).get("sudu_group")?.value ?? "";
  if (inGroup) redirect(`/g/${inGroup}`);

  const result = await placeOrder({
    batchId: String(form.get("batch_id") ?? ""),
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    hostel: String(form.get("hostel") ?? ""),
    lines,
    coupon: String(form.get("coupon") ?? "").trim(),
    groupMode: mode === "one_payer" || mode === "split" ? mode : null,
    paymentMethod: String(form.get("payment_method") ?? "") === "card" ? "card" : "transfer",
    collectMode: String(form.get("collect_mode") ?? "") === "each" ? "each" : "leader",
    people: parsePeople(form.get("people")),
    customerNote: String(form.get("customer_note") ?? "").trim().slice(0, 300),
    joinOrderId: String(form.get("join_order_id") ?? "") || undefined,
    shareDelivery: String(form.get("share_delivery") ?? "") === "on",
    deliverAt: String(form.get("deliver_at") ?? "") || undefined,
  });

  if (!result.ok) return { error: result.error };

  // In a shared delivery the next thing that matters is the group filling up,
  // not this one order: there is no total to pay yet. So they land on the
  // board, with their own order marked so it knows which of them they are.
  if (result.sharedGroupId) {
    redirect(`/g/${result.sharedGroupId}?me=${result.orderId}&placed=1`);
  }
  redirect(`/o/${result.orderId}?placed=1`);
}

export type ReorderState = { error: string | null };

/** One-tap reorder: phone number recalls the last order into an open batch. */
export async function submitReorder(
  _prev: ReorderState,
  form: FormData
): Promise<ReorderState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "That phone number doesn't look right." };

  const previous = await lastOrderForPhone(phone);
  if (!previous) return { error: "No previous order found for that number." };

  const result = await placeOrder({
    batchId: String(form.get("batch_id") ?? ""),
    name: previous.customer_name,
    phone,
    hostel: previous.hostel,
    lines: previous.lines.map((l) => ({ menu_item_id: l.menu_item_id, qty: l.qty })),
  });

  if (!result.ok) return { error: result.error };
  redirect(`/o/${result.orderId}?placed=1`);
}

/**
 * Saves the cart behind a typed phone number, so a checkout that never
 * finishes can be followed up. Called as the number is typed, and again as the
 * cart changes, so the admin sees what was nearly bought.
 */
export async function keepCart(form: FormData): Promise<void> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!phone) return;

  const items = Number(form.get("items") ?? 0);
  if (!Number.isFinite(items) || items <= 0) return;

  await rememberCart({
    phone,
    name: String(form.get("name") ?? "").trim(),
    hostel: String(form.get("hostel") ?? "").trim(),
    batchId: String(form.get("batch_id") ?? "") || null,
    items: Math.round(items),
    value: Math.round(Number(form.get("value") ?? 0)) || 0,
    summary: String(form.get("summary") ?? "").slice(0, 500),
  });
}

export type CouponState = {
  error: string | null;
  code: string | null;
  discount: number;
  label: string | null;
};

/** Checking a code at checkout, before anything is placed. */
export async function tryCoupon(
  _prev: CouponState,
  form: FormData
): Promise<CouponState> {
  const code = String(form.get("coupon") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter a code.", code: null, discount: 0, label: null };

  const result = await previewCoupon({
    code,
    batchId: String(form.get("batch_id") ?? ""),
    lines: parseCart(form.get("cart")),
    phone: String(form.get("phone") ?? ""),
  });

  return result.ok
    ? { error: null, code, discount: result.discount, label: result.label }
    : { error: result.error, code: null, discount: 0, label: null };
}

export type MoveState = {
  error: string | null;
  /** The run it landed on, so the page can say so rather than just redrawing. */
  movedTo: string | null;
};

/** Moves an order onto another run. Two taps: the button, then the run. */
export async function moveOrderToRun(
  _prev: MoveState,
  form: FormData
): Promise<MoveState> {
  const result = await moveOrder(
    String(form.get("order_id")),
    String(form.get("batch_id"))
  );
  if (!result.ok) return { error: result.error, movedTo: null };

  revalidatePath(`/o/${result.orderId}`);
  revalidatePath("/orders");
  return { error: null, movedTo: String(form.get("run_label") ?? "the new run") };
}

export type FillState = {
  error: string | null;
  me: { name: string; hostel: string } | null;
};

/**
 * Fills checkout from a returning customer's own details. It asks for the PIN
 * as well as the number, because a name and a block are worth protecting: a
 * number alone would let anyone look up where a classmate lives.
 */
export async function fillMyDetails(
  _prev: FillState,
  form: FormData
): Promise<FillState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "That phone number doesn't look right.", me: null };

  const me = await customerDetails(phone);
  if (!me) {
    return {
      error: "Nothing has been ordered under that number yet. Fill the form in below.",
      me: null,
    };
  }

  const pin = String(form.get("pin") ?? "").trim();
  const signedIn = (await currentCustomer()) === phone;

  // Already signed in on this device, so the PIN has been given once already.
  if (!signedIn) {
    if (!pin) return { error: "Your four-digit PIN as well, please.", me: null };
    const result = await checkPin(phone, pin);
    if (!result.ok) return { error: result.error, me: null };
    await signInCustomer(phone);
  }

  return { error: null, me };
}

export type PinState = { error: string | null };

/**
 * Order history is unlocked with a phone number and the four digit PIN we give
 * out on WhatsApp. No signup, no password to reset.
 */
export async function signInWithPin(
  _prev: PinState,
  form: FormData
): Promise<PinState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "That phone number doesn't look right." };

  const result = await checkPin(phone, String(form.get("pin") ?? ""));
  if (!result.ok) return { error: result.error };

  await signInCustomer(phone);
  // Signing in from Order again should land back there, not on the history.
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/orders");
}

export async function forgetMe(form?: FormData): Promise<void> {
  await signOutCustomer();
  const next = String(form?.get("next") ?? "");
  redirect(next.startsWith("/") ? next : "/orders");
}


/** The group's other members, as the cart recorded them. */
function parsePeople(
  value: FormDataEntryValue | null
): {
  name: string;
  phone: string;
  hostel: string;
  pays?: "transfer" | "card";
}[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.name === "string")
      .map((entry) => ({
        name: String(entry.name),
        phone: String(entry.phone ?? ""),
        hostel: String(entry.hostel ?? ""),
        pays: entry.pays === "card" ? ("card" as const) : ("transfer" as const),
      }));
  } catch {
    return [];
  }
}

export type RatingState = { error: string | null; saved: boolean };

/**
 * How a delivered order went.
 *
 * Only the person holding the order's own link can answer, which is the same
 * rule the rest of that page runs on, and only once it has actually arrived.
 * Answering again replaces the first answer rather than adding a second, so
 * somebody who taps three stars and then thinks better of it can say so.
 */
export async function rateOrder(
  _prev: RatingState,
  form: FormData
): Promise<RatingState> {
  const id = String(form.get("order_id") ?? "");

  // The rules live beside the order, because the app asks the same question
  // through its own endpoint and the two must not drift apart.
  const { error } = await saveRating(
    id,
    Number(form.get("rating") ?? 0),
    String(form.get("feedback") ?? "")
  );
  if (error) return { error, saved: false };

  revalidatePath(`/o/${id}`);
  return { error: null, saved: true };
}

/** "I have finished ordering." Closes the group when it was the last of them. */
export async function finishOrdering(form: FormData): Promise<void> {
  // The id of their food waiting in the group, not of an order: in a shared
  // delivery there is no order until the group closes.
  const id = String(form.get("order_id") ?? "");
  if (!id) return;

  await markDone(id);
  revalidatePath("/g", "layout");
  revalidatePath("/o", "layout");
}

/** The leader closing it by hand, rather than waiting out the clock. */
export async function closeSharedGroup(form: FormData): Promise<void> {
  const id = String(form.get("group_id") ?? "");
  if (!id) return;

  await closeGroup(id);
  revalidatePath(`/g/${id}`);
  revalidatePath("/o", "layout");
}
