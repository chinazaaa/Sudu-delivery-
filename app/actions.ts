"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { placeOrder } from "@/lib/orders";
import { lastOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
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
    promoterCode:
      String(form.get("ref") ?? "") || (await cookies()).get("sudu_ref")?.value || null,
    groupMode: mode === "one_payer" || mode === "split" ? mode : null,
  });

  if (!result.ok) return { error: result.error };
  redirect(`/o/${result.orderId}`);
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
    promoterCode: null, // Attribution is already bound to this phone number.
  });

  if (!result.ok) return { error: result.error };
  redirect(`/o/${result.orderId}`);
}

export async function lookupLastOrder(
  _prev: { error: string | null },
  form: FormData
): Promise<{ error: string | null }> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "That phone number doesn't look right." };
  redirect(`/reorder?phone=${phone}`);
}
