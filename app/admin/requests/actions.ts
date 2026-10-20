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
  if (!["new", "quoted", "done", "converted", "dropped"].includes(status)) return;

  const quoted = Number(String(form.get("quoted") ?? "").replace(/[^\d]/g, ""));

  await db()
    .from("custom_requests")
    .update({
      status,
      ...(quoted > 0 ? { quoted } : {}),
      // Putting an ask back says nothing came of it after all, so the
      // order it was pointing at is let go with it. Keeping the link
      // would leave an ask that is waiting on somebody and finished at
      // the same time, and the order is still there to be pointed at
      // again if it turns out it was the right one.
      ...(status === "new"
        ? { order_id: null }
        : { answered_at: new Date().toISOString() }),
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
  // Delivery sits inside what she handed over, and apart in the record: the
  // goods are bought and sold on, the trip is the part that is ours.
  const fee = money(form.get("fee"));
  const took = each * howMany + fee;
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
      fee,
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

/**
 * A custom order taken by hand, because the best ones arrive by phone.
 *
 * The form at /custom-order catches the ones typed on the website. The
 * order that proved this whole thing was worth building came in on a call:
 * somebody asked an assistant where to get an ice cream, rang the shop,
 * and had the order typed in afterwards. Nothing recorded that she had
 * asked for anything, so the one list that is supposed to say what people
 * want had no idea it had happened.
 *
 * Anything taken over the counter can be written down here, and counted
 * with the rest.
 */
export async function addRequest(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const wanted = String(form.get("wanted") ?? "").trim();
  if (wanted === "") return;

  // Already bought it on the website, so it is closed on arrival and the
  // money is counted on that order rather than here.
  const already = String(form.get("converted") ?? "") !== "";

  await db()
    .from("custom_requests")
    .insert({
      wanted: wanted.slice(0, 300),
      name: String(form.get("name") ?? "").trim().slice(0, 80),
      phone: String(form.get("phone") ?? "").trim().slice(0, 20),
      hostel: String(form.get("hostel") ?? "").trim().slice(0, 80),
      budget: String(form.get("budget") ?? "").trim().slice(0, 60),
      note: String(form.get("note") ?? "").trim().slice(0, 500),
      status: already ? "converted" : "new",
      ...(already ? { answered_at: new Date().toISOString() } : {}),
    });

  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

/**
 * Which order an ask turned into.
 *
 * An ask can become three things: a product on a shelf, a line in the
 * errand book, or an ordinary order on a run. The first two were already
 * remembered and the third was not, so the card could say somebody had
 * placed it and not say which one, and the only question this list exists
 * to answer, whether asking for a thing ever came to anything, meant going
 * and looking.
 *
 * Taken as the order's number rather than its id, because the number is
 * what it is called everywhere else in here and on the message that went
 * to the customer. An id is on a URL and nowhere a person reads.
 */
export async function linkRequestToOrder(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  const number = Number(String(form.get("order_no") ?? "").replace(/[^\d]/g, ""));
  if (id === "" || !Number.isFinite(number) || number <= 0) return;

  const { data } = await db()
    .from("orders")
    .select("id")
    .eq("order_no", number)
    .maybeSingle();

  // Quiet about a number nobody recognises rather than loud: this box sits
  // on a card somebody is tidying up, and a thrown error there loses the
  // page. An unrecognised number simply does not link, and the box is
  // still there to try again.
  const order = data as { id: string } | null;
  if (!order) return;

  await db()
    .from("custom_requests")
    .update({ order_id: order.id, status: "converted" })
    .eq("id", id);

  revalidatePath("/admin/requests");
}

/**
 * The order on this ask was the wrong one.
 *
 * Separate from putting the ask back, because they mean different things.
 * Putting it back says nothing came of the ask at all, which somebody
 * means about once: the order was cancelled, or it belonged to a different
 * ask. Typing the wrong number into a box is the thing somebody does
 * constantly, and the only way out of it was to reopen the whole ask,
 * leave it sitting in the waiting list for a while and then finish it
 * again.
 *
 * So this lets go of the order and leaves the ask finished, which puts the
 * box for the number straight back on the card.
 */
export async function unlinkRequestOrder(form: FormData): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");

  const id = String(form.get("id") ?? "");
  if (id === "") return;

  await db().from("custom_requests").update({ order_id: null }).eq("id", id);

  revalidatePath("/admin/requests");
}
