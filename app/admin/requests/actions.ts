"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";
import { lagosToday } from "@/lib/time";
import { ensureCustomer } from "@/lib/orders";

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

/**
 * Bought it for her, took her money, done. One button.
 *
 * Most of what people ask for is a one-off: a particular adapter for a
 * particular girl, which nobody else will ever want. Making a product for it
 * and then an order for it is two records that are not true, kept in order
 * to hold one number that is.
 *
 * So the money goes straight onto the "other money" page as a line, the ask
 * is marked done, and nothing is invented. Profit is what came in less what
 * went out, and if you only know the profit, put it in as what came in and
 * leave the cost empty.
 */
export async function settleRequest(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  if (id === "") return;

  const { data } = await db()
    .from("custom_requests")
    .select("wanted, name, phone, hostel, money_id")
    .eq("id", id)
    .maybeSingle();
  const ask = data as
    | {
        wanted: string;
        name: string;
        phone: string;
        hostel: string;
        money_id: string | null;
      }
    | null;
  if (!ask) return;
  // Already counted. Pressing it twice must not count the money twice.
  if (ask.money_id) return;

  const money = (said: FormDataEntryValue | null): number => {
    const digits = String(said ?? "").replace(/[^\d]/g, "");
    return digits === "" ? 0 : Math.min(100_000_000, Number(digits));
  };
  // How many of it, and what one of them cost her. She asked for one thing
  // and bought three, and a line saying ₦21,000 with no count does not say
  // what was sold.
  const howMany = Math.max(1, Math.min(999, money(form.get("how_many")) || 1));
  const each = money(form.get("took"));
  const took = each * howMany;
  const spent = money(form.get("spent"));
  if (took === 0 && spent === 0) return;

  const { data: line, error } = await db()
    .from("other_money")
    .insert({
      happened_on: lagosToday(),
      what: String(ask.wanted ?? "").split("\n")[0].trim().slice(0, 140),
      who: String(ask.name ?? "").trim().slice(0, 80),
      phone: ask.phone ?? "",
      how_many: howMany,
      took,
      spent,
      note: "Asked for",
    })
    .select("id")
    .single();
  if (error || !line) {
    throw new Error(`Could not record that: ${error?.message ?? "nothing came back"}`);
  }

  // She paid us and got a thing, so she is a customer, whether or not she
  // ever places an order. No promoter and no first-order discount is spent:
  // a row on its own is not an order, and the checkout still knows that.
  await ensureCustomer({
    phone: ask.phone ?? "",
    name: ask.name ?? "",
    hostel: ask.hostel ?? "",
  }).catch(() => {});

  await db()
    .from("custom_requests")
    .update({
      money_id: (line as { id: string }).id,
      status: "done",
      quoted: took > 0 ? took : null,
      answered_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/requests");
  revalidatePath("/admin/money");
  revalidatePath("/admin/customers");
  revalidatePath("/admin");
}
