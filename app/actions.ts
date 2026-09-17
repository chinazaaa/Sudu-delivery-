"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { moveOrder, placeOrder } from "@/lib/orders";
import { lastOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { rememberCart } from "@/lib/carts";
import {
  checkPin,
  currentCustomer,
  customerDetails,
  signInCustomer,
  signOutCustomer,
} from "@/lib/customer-auth";
import type { CartLine } from "@/lib/types";

export type SubmitState = { error: string | null };

export async function submitOrder(
  _prev: SubmitState,
  form: FormData
): Promise<SubmitState> {
  let lines: CartLine[];
  try {
    lines = JSON.parse(String(form.get("cart") ?? "[]"));
  } catch {
    return { error: "Something went wrong with your cart. Please rebuild it." };
  }

  const mode = String(form.get("group_mode") ?? "");

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
  });

  if (!result.ok) return { error: result.error };
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
