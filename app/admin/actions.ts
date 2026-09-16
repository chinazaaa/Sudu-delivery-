"use server";

import { revalidatePath } from "next/cache";
import { isSignedIn, passwordMatches, signIn, signOut } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";
import { STAGES, type BatchStage } from "@/lib/stages";

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
 * Manual "mark paid". The transfer is matched by the phone number in the
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

/** Refunds are same-night and in full. There are no partial refunds here. */
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

/** A real capacity cap. Only set this when the car genuinely fills up. */
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

/**
 * Settings are saved section by section, so only the fields a form actually
 * posts are written. Anything left out keeps its current value instead of
 * being blanked by a form that never showed it.
 */
const SETTING_FIELDS = [
  "bank_name",
  "bank_account_name",
  "bank_account_number",
  "whatsapp_number",
  "card_note",
  "instagram_handle",
  "whatsapp_group_link",
  "pitch_line",
] as const;

export async function saveSettings(form: FormData): Promise<void> {
  await assertAdmin();

  const patch: Record<string, string> = {};
  for (const field of SETTING_FIELDS) {
    const value = form.get(field);
    if (value !== null) patch[field] = String(value).trim();
  }
  if (Object.keys(patch).length === 0) return;

  await db()
    .from("settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true);

  revalidatePath("/admin/settings");
  revalidatePath("/");
}

/**
 * A flash fee drop on one batch. Blank clears it. The reason is shown to
 * customers, because a bare cut reads as an admission that the normal fee was
 * always too high (addendum §4).
 */
export async function setFlashFee(form: FormData): Promise<void> {
  await assertAdmin();
  const raw = String(form.get("flash_fee") ?? "").trim();
  const fee = raw === "" ? null : Math.round(Number(raw));

  await db()
    .from("batches")
    .update({
      flash_fee: fee !== null && Number.isFinite(fee) && fee >= 0 ? fee : null,
      flash_fee_reason: String(form.get("flash_fee_reason") ?? "").trim(),
    })
    .eq("id", String(form.get("batch_id")));

  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * One tap per stage of the run, shared by everyone in the batch. This is the
 * whole of tracking: no rider app, no GPS, nothing to go wrong on the road.
 */
export async function setBatchStage(form: FormData): Promise<void> {
  await assertAdmin();
  const stage = String(form.get("stage"));
  if (!STAGES.includes(stage as BatchStage)) return;

  await db()
    .from("batches")
    .update({ stage, stage_updated_at: new Date().toISOString() })
    .eq("id", String(form.get("batch_id")));

  revalidatePath("/admin");
  revalidatePath("/orders");
}

/** Restaurants are added and edited here, not only by running the seed file. */
export async function addRestaurant(form: FormData): Promise<void> {
  await assertAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;

  await db().from("restaurants").insert({
    name,
    address: String(form.get("address") ?? "").trim(),
    closes_at: String(form.get("closes_at") ?? "").trim() || "21:00",
    active: true,
    sort_order: 100,
  });
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

export async function updateRestaurant(form: FormData): Promise<void> {
  await assertAdmin();

  await db()
    .from("restaurants")
    .update({
      name: String(form.get("name") ?? "").trim() || undefined,
      address: String(form.get("address") ?? "").trim(),
      closes_at: String(form.get("closes_at") ?? "").trim() || undefined,
      // Off keeps a restaurant and its menu but takes it off the site, which is
      // how the brief adds Panarottis and the rest once the run is boring.
      active: form.get("active") === "on",
    })
    .eq("id", String(form.get("restaurant_id")));
  revalidatePath("/admin/menu");
  revalidatePath("/");
}

/** The two launch restaurants and their menu, for a database with no seed. */
export async function seedLaunchRestaurants(): Promise<void> {
  await assertAdmin();

  const { data: existing } = await db().from("restaurants").select("id").limit(1);
  if (existing && existing.length > 0) return;

  const launch = [
    {
      name: "KFC Novare",
      address: "Novare Mall, Sangotedo",
      closes_at: "21:00",
      sort_order: 1,
      items: [
        ["Original Recipe 2pc + chips", 6500],
        ["8pc bucket", 18000],
        ["Wrap meal", 5500],
        ["Refuel Meal", 7000],
        ["Zinger burger meal", 8000],
      ] as const,
    },
    {
      name: "Domino's Pizza",
      address: "KM 34 Lekki-Epe Expy, Emperor Estate",
      closes_at: "22:00",
      sort_order: 2,
      items: [
        ["Medium pepperoni", 11000],
        ["Medium BBQ chicken", 12000],
        ["Large meat lovers", 17500],
        ["Chicken wings (6)", 6500],
        ["Garlic bread", 3000],
      ] as const,
    },
  ];

  for (const place of launch) {
    const { data: restaurant } = await db()
      .from("restaurants")
      .insert({
        name: place.name,
        address: place.address,
        closes_at: place.closes_at,
        active: true,
        sort_order: place.sort_order,
      })
      .select("id")
      .single();
    if (!restaurant) continue;

    await db().from("menu_items").insert(
      place.items.map(([name, price], index) => ({
        restaurant_id: restaurant.id,
        name,
        price_food: price,
        sort_order: index + 1,
      }))
    );
  }
  revalidatePath("/admin/menu");
  revalidatePath("/");
}
