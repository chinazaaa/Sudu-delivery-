"use server";

import { revalidatePath } from "next/cache";

import { boxById, cartOf, occasionBySlug } from "@/lib/boxes";
import { markCustomPending } from "@/lib/order-edit";
import { whenOptions } from "@/lib/box-view";
import { furthest, isUrgent, readRepeat, tripForBox } from "@/lib/box-day";
import { lagosToday } from "@/lib/time";
import { db } from "@/lib/supabase";
import { cameFromNow, linkCouponNow } from "@/lib/where-from";
import { placeOrder } from "@/lib/orders";
import { orderLinkId } from "@/lib/orders";
import { OPENED, sprung, tooFast, TRAP } from "@/lib/guard";
import { askFor } from "@/lib/requests";
import { tellAdmin } from "@/lib/admin-alerts";

export type BoxOrderState = { error: string; orderId?: string };

/**
 * Ordering a box.
 *
 * Its own action rather than the ordinary checkout, for the same reason a
 * checkout link has one: the price is settled before anybody arrives. The
 * ladder would put eight containers at eight thousand and there would be no
 * box left to sell.
 *
 * Everything that decides money is looked up here rather than read off the
 * form. A page can say a box costs four thousand to deliver; only the shop
 * can say it, and a swap is only a swap because the shop offered it.
 */
export async function orderBox(
  _prev: BoxOrderState,
  form: FormData
): Promise<BoxOrderState> {
  // Everything inside, because a throw from a server action is the error
  // boundary, and the error boundary is a stranger's page saying "that did
  // not go through" over a form they have already filled in. Reading runs
  // and settings both throw on a database hiccup, and neither of them is
  // worth losing an order over.
  try {
    return await order(form);
  } catch (problem) {
    return {
      error:
        problem instanceof Error && problem.message !== ""
          ? `Could not place that: ${problem.message}`
          : "Could not place that just now. Try again in a moment.",
    };
  }
}

async function order(form: FormData): Promise<BoxOrderState> {
  if (sprung(form.get(TRAP)) || tooFast(form.get(OPENED))) {
    return { error: "That did not go through. Give it a moment and try again." };
  }

  const occasion = await occasionBySlug(String(form.get("occasion") ?? ""));
  const box = await boxById(String(form.get("box") ?? ""));
  if (!occasion || !occasion.active || !box || !box.active) {
    return { error: "That box is not on any more." };
  }

  const asked = String(form.get("when") ?? "");

  // A day of their own, or no day at all.
  //
  // A box is sourced, packed and then carried, so unlike food it does not
  // have to ride tonight's run. "day:2026-10-04" is a date they picked;
  // "anytime" is them saying any day suits and we will agree one. Either
  // way it travels on a trip of its own, made here.
  //
  // What it costs to carry is decided here and not on the form: two clear
  // days is the standard fee, sooner than that is the urgent one, and a page
  // left open overnight cannot talk us into yesterday's price.
  let going: {
    runId: string;
    at: string;
    fee: number;
    wanted: string;
  } | null = null;

  if (asked === "anytime" || asked.startsWith("day:")) {
    const wanted = asked.startsWith("day:") ? asked.slice(4) : "";
    if (wanted !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(wanted)) {
      return { error: "Pick the day you would like it." };
    }
    if (wanted !== "" && (wanted < lagosToday() || wanted > furthest())) {
      return { error: "Pick a day between today and three weeks from now." };
    }

    const trip = await tripForBox(
      wanted,
      wanted === "" ? `${occasion.name} · day to agree` : `${occasion.name} · ${box.name}`
    );
    if (!trip) return { error: "Could not start that one. Try again in a moment." };

    going = {
      runId: trip.id,
      at: "",
      // One price, whichever day they asked for. A box used to cost the
      // car fee on a day close enough to count as urgent, which is the one
      // thing a box no longer does: it goes on a run. That price also
      // carries the floors, four thousand ordinarily and seven with Uncle
      // Stan's in it, and car_fee carried neither.
      fee: box.run_fee,
      wanted,
    };
  } else {
    // Which of the ways of getting it here they picked, matched against the
    // list the shop would offer right now. A page left open all afternoon is
    // still showing this morning's cars.
    const options = await whenOptions(occasion, box);
    const picked = options.find((one) => one.key === asked);
    if (!picked) {
      return {
        error:
          options.length === 0
            ? "Nothing can get there in time now."
            : "That time has gone. Pick another one.",
      };
    }
    going = { runId: picked.runId, at: picked.at, fee: picked.fee, wanted: picked.date };
  }

  const result = await placeOrder({
    cameFrom: await cameFromNow(),
    autoCoupon: await linkCouponNow(
      form.has("heard_from") ? String(form.get("heard_from") ?? "").trim() : undefined
    ),
    batchId: going.runId,
    deliverAt: going.at || undefined,
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    hostel: String(form.get("hostel") ?? ""),
    lines: cartOf(box, swapsFrom(form)),
    paymentMethod: form.get("payment") === "card" ? "card" : "transfer",
    // Only ever on a card: a transfer is naira, and a currency riding along
    // on one would send somebody a Stripe link for an order they are paying
    // into a Nigerian account.
    payCurrency:
      form.get("payment") === "card"
        ? ((): "GBP" | "USD" | undefined => {
            const said = String(form.get("pay_currency") ?? "").toUpperCase();
            return said === "GBP" || said === "USD" ? said : undefined;
          })()
        : undefined,
    customerNote: String(form.get("note") ?? ""),
    heardFrom: String(form.get("heard_from") ?? ""),
    // Buying it for somebody else. Their name and number, so the driver
    // rings them; the payer stays the customer and keeps every message
    // about money.
    giftTo: giftFrom(form),
    // The whole point of a box: one price, delivery in it, whichever way it
    // travels. What that is depends on the car, not on the cart.
    fixedFee: going.fee,
    // So analytics can say which box anybody wanted, which is the whole
    // reason for packing three rather than one.
    boxId: box.id,
  });

  if (!result.ok) return { error: result.error };

  // Anything written in the changes box makes the price provisional.
  //
  // It used to need a tick as well, which put the whole thing on somebody
  // remembering to tick it: they ask for a twelve inch cake, forget the box,
  // and the order says a price we never agreed. Flagging one that turns out
  // to need nothing costs a press in admin. Missing one costs the argument.
  if (String(form.get("note") ?? "").trim() !== "") {
    await markCustomPending(result.orderId).catch(() => {});
  }

  // The day they asked for, and whether they want it again. Written after
  // the order rather than through it, because neither of these decides a
  // price and neither is worth failing an order over.
  const repeat = readRepeat(form.get("repeat"));
  const note = String(form.get("repeat_note") ?? "").trim().slice(0, 120);
  if (going.wanted !== "" || repeat !== "") {
    await db()
      .from("orders")
      .update({
        ...(going.wanted !== "" ? { wanted_on: going.wanted } : {}),
        ...(repeat !== "" ? { repeat_every: repeat, repeat_note: note } : {}),
      })
      .eq("id", result.orderId)
      .then(
        () => undefined,
        () => undefined
      );
  }

  // The order exists from here on, so nothing after it may fail loudly. A
  // short code that cannot be read is a nicer address, not a condition of
  // having ordered, and the long id opens the same page.
  let where = result.orderId;
  try {
    where = await orderLinkId(result.orderId);
    revalidatePath("/admin", "layout");
  } catch {
    /* Ordered either way. */
  }

  return { error: "", orderId: where };
}

/**
 * The swaps they chose, as a line id to the index of its alternative.
 *
 * Read off fields named for their line, so a box whose lines were reordered
 * in admin between the page loading and the order landing cannot quietly
 * move somebody's choice onto a different dish.
 */
function swapsFrom(form: FormData): Record<string, number> {
  const chosen: Record<string, number> = {};
  for (const [field, value] of form.entries()) {
    if (!field.startsWith("swap_")) continue;
    const pick = Number(value);
    if (Number.isFinite(pick) && pick >= 0) chosen[field.slice(5)] = Math.round(pick);
  }
  return chosen;
}


/**
 * Who it is going to, when that is not the person paying.
 *
 * Filling either field is the answer. There used to be a tick box as well,
 * which meant somebody could type a friend's name and number, leave it
 * unticked, and have their friend's dinner delivered to themselves with no
 * sign anything had been ignored.
 *
 * Half of one goes through as a gift on purpose, so the order is refused
 * with a sentence about the missing half rather than quietly becoming an
 * ordinary order.
 */
function giftFrom(form: FormData): { name: string; phone: string } | undefined {
  const name = String(form.get("gift_name") ?? "").trim();
  const phone = String(form.get("gift_phone") ?? "").trim();
  return name === "" && phone === "" ? undefined : { name, phone };
}

export type CurateState = { error: string; done: boolean };

/**
 * A box somebody wants that nobody has packed.
 *
 * The shelves hold what the shop decided to pack, which is most of what
 * anybody wants and never all of it. Until now the only answer to "could
 * you do one with X in it" was the changes box on a box that was already
 * nearly right, and somebody who wanted something else entirely had to
 * find the custom order page by themselves.
 *
 * It goes into the same list as every other thing we do not stock, because
 * it is the same job: find it, price it, ring them back. The shelf it was
 * asked from rides along so whoever answers knows what they were looking
 * at, which is half of knowing what they meant.
 */
export async function curateABox(
  _prev: CurateState,
  form: FormData
): Promise<CurateState> {
  const said = (name: string) => String(form.get(name) ?? "");
  const shelf = said("shelf").trim();
  // What this shelf calls one of its things, so the list in admin says
  // "a hamper to curate" rather than leaving whoever answers to work it
  // out from the shelf's name.
  const thing = said("thing").trim().toLowerCase() || "box";

  /*
   * Three fields, because three is all this asks for now.
   *
   * It used to take a budget, a block or an address, and a note, which is a
   * page of questions in front of somebody who has not been quoted a price
   * yet. None of it was needed to answer them: this goes straight on to
   * WhatsApp, where the day, the place and the money are settled anyway.
   * What cannot be settled later is what they want and how to reach them.
   */
  const result = await askFor({
    wanted: said("wanted"),
    budget: "",
    name: said("name"),
    phone: said("phone"),
    hostel: "",
    note: shelf === "" ? `Wants a customised ${thing}.` : `Wants a customised ${thing}, from ${shelf}.`,
  });

  if (!result.ok) return { error: result.error, done: false };

  try {
    await tellAdmin({
      title: `A ${thing} to curate${shelf === "" ? "" : ` · ${shelf}`}`,
      body: `${said("name").trim() || "Someone"} wants ${said("wanted").trim()}.`,
      url: "/admin/requests",
    });
  } catch {
    /* The request is saved either way. */
  }

  return { error: "", done: true };
}
