"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";

/**
 * Where a request has got to, and what it was quoted at.
 *
 * Nothing here messages anybody: the answer goes out on WhatsApp by hand
 * like every other word this shop says to a customer. This records what
 * happened, so a request cannot quietly be forgotten, and so the ones that
 * keep coming back are visible as a pattern rather than as a feeling.
 */
export async function markRequest(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "");
  if (!["new", "quoted", "done", "dropped"].includes(status)) return;

  const quoted = Number(String(form.get("quoted") ?? "").replace(/[^\d]/g, ""));

  await db()
    .from("custom_requests")
    .update({
      status,
      ...(quoted > 0 ? { quoted } : {}),
      ...(status === "new" ? {} : { answered_at: new Date().toISOString() }),
    })
    .eq("id", id);

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

/**
 * Put a request on a shelf, as a product, in one tap.
 *
 * The whole point of this page is spotting that three people want the same
 * thing. Spotting it and then walking to another part of admin to retype
 * the name is where it stopped being worth doing, so this takes what they
 * wrote and what you priced it at and makes the product from it.
 *
 * Deliberately thin: a name, a price and a shelf. No photograph, no
 * description, no options. Those are the things only you can decide, and the
 * card hands you an Edit link straight afterwards to decide them. A product
 * nobody can buy yet is better than a form nobody fills in.
 */
export async function shelveRequest(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  const restaurantId = String(form.get("restaurant_id") ?? "");
  if (id === "" || restaurantId === "") return;

  const { data: ask } = await db()
    .from("custom_requests")
    .select("wanted, quoted, menu_item_id")
    .eq("id", id)
    .maybeSingle();
  const request = ask as
    | { wanted: string; quoted: number | null; menu_item_id: string | null }
    | null;
  if (!request) return;

  // Already on a shelf. Tapping twice should not leave two of the same
  // thing on the menu for somebody to find and wonder about.
  if (request.menu_item_id) return;

  // What you typed into "Priced at" wins, because it is the figure you
  // settled on; what they said they would pay is only ever a starting point.
  const typed = Number(String(form.get("quoted") ?? "").replace(/[^\d]/g, ""));
  const price = typed > 0 ? typed : Number(request.quoted ?? 0);

  // Their words are a sentence, not a product name. The first line of it,
  // cut to something that fits on a card, and you rename it in a moment.
  const name = String(request.wanted ?? "")
    .split("\n")[0]
    .trim()
    .slice(0, 80);
  if (name === "") return;

  const { data: made, error } = await db()
    .from("menu_items")
    .insert({
      restaurant_id: restaurantId,
      name,
      price_food: price,
      // On sale only once it has a price. Without one the menu page already
      // refuses to put it on sale, and a ₦0 thing on a live shelf is worse
      // than one waiting quietly to be finished.
      available: price > 0,
    })
    .select("id")
    .single();
  if (error || !made) {
    throw new Error(
      `Could not add it to the shelf: ${error?.message ?? "nothing came back"}.`
    );
  }

  await db()
    .from("custom_requests")
    .update({
      menu_item_id: (made as { id: string }).id,
      // It is priced and on the shelf now, which is the thing "quoted"
      // means here. Still yours to mark done when it is actually delivered.
      ...(price > 0 ? { status: "quoted", quoted: price } : {}),
      answered_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/requests");
  revalidatePath("/admin/menu", "layout");
  revalidatePath("/admin");
}
