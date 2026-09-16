"use server";

import { revalidatePath } from "next/cache";
import { isSignedIn, passwordMatches, signIn, signOut } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";

async function assertAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

export async function login(
  _prev: { error: string | null },
  form: FormData
): Promise<{ error: string | null }> {
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    return { error: "Wrong password." };
  }
  await signIn();
  revalidatePath("/admin");
  return { error: null };
}

export async function logout(): Promise<void> {
  await signOut();
  revalidatePath("/admin");
}

/**
 * Manual "mark paid" — the transfer is matched by the phone number in the
 * narration. This is replaced by a Paystack webhook once reconciliation stops
 * being trivial (brief §13), which is why payment_ref exists from day one.
 */
export async function markPaid(form: FormData): Promise<void> {
  await assertAdmin();
  const id = String(form.get("order_id"));
  const ref = String(form.get("payment_ref") ?? "").trim();

  await db()
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_ref: ref || null,
    })
    .eq("id", id);
  revalidatePath("/admin");
}

export async function markDelivered(form: FormData): Promise<void> {
  await assertAdmin();
  await db()
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", String(form.get("order_id")));
  revalidatePath("/admin");
}

/** Refunds are same-night and in full — there are no partial refunds here. */
export async function refundOrder(form: FormData): Promise<void> {
  await assertAdmin();
  await db()
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", String(form.get("order_id")));
  revalidatePath("/admin");
}

export async function setBatchStatus(form: FormData): Promise<void> {
  await assertAdmin();
  await db()
    .from("batches")
    .update({ status: String(form.get("status")) })
    .eq("id", String(form.get("batch_id")));
  revalidatePath("/admin");
}

/** A real capacity cap — only set this when the car genuinely fills up. */
export async function setBatchCapacity(form: FormData): Promise<void> {
  await assertAdmin();
  const raw = String(form.get("capacity") ?? "").trim();
  const capacity = raw === "" ? null : Number(raw);

  await db()
    .from("batches")
    .update({ capacity: Number.isFinite(capacity as number) ? capacity : null })
    .eq("id", String(form.get("batch_id")));
  revalidatePath("/admin");
}

export async function updateMenuItem(form: FormData): Promise<void> {
  await assertAdmin();
  const price = Number(form.get("price_food"));
  if (!Number.isFinite(price) || price < 0) return;

  await db()
    .from("menu_items")
    .update({
      price_food: Math.round(price),
      available: form.get("available") === "on",
      name: String(form.get("name") ?? "").trim() || undefined,
    })
    .eq("id", String(form.get("item_id")));
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function addMenuItem(form: FormData): Promise<void> {
  await assertAdmin();
  const name = String(form.get("name") ?? "").trim();
  const price = Number(form.get("price_food"));
  if (!name || !Number.isFinite(price) || price < 0) return;

  await db().from("menu_items").insert({
    restaurant_id: String(form.get("restaurant_id")),
    name,
    price_food: Math.round(price),
    sort_order: 100,
  });
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function savePromoter(form: FormData): Promise<void> {
  await assertAdmin();
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!code) return;

  await db().from("promoters").upsert({
    code,
    name: String(form.get("name") ?? "").trim(),
    phone: String(form.get("phone") ?? "").trim(),
    rate: Math.round(Number(form.get("rate")) || 500),
    active: form.get("active") === "on",
  });
  revalidatePath("/admin/promoters");
}
