"use server";

import { revalidatePath } from "next/cache";

import { boxById, cartOf, occasionBySlug } from "@/lib/boxes";
import { whenOptions } from "@/lib/box-view";
import { placeOrder } from "@/lib/orders";
import { orderLinkId } from "@/lib/orders";
import { OPENED, sprung, tooFast, TRAP } from "@/lib/guard";

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

  // Which of the ways of getting it here they picked, matched against the
  // list the shop would offer right now. A page left open all afternoon is
  // still showing this morning's cars.
  const options = await whenOptions(occasion, box);
  const going = options.find((one) => one.key === String(form.get("when") ?? ""));
  if (!going) {
    return {
      error:
        options.length === 0
          ? "Nothing can get there in time now."
          : "That time has gone. Pick another one.",
    };
  }

  const result = await placeOrder({
    batchId: going.runId,
    deliverAt: going.at || undefined,
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    hostel: String(form.get("hostel") ?? ""),
    lines: cartOf(box, swapsFrom(form)),
    paymentMethod: form.get("payment") === "card" ? "card" : "transfer",
    customerNote: String(form.get("note") ?? ""),
    heardFrom: String(form.get("heard_from") ?? ""),
    // Buying it for somebody else. Their name and number, so the driver
    // rings them; the payer stays the customer and keeps every message
    // about money.
    giftTo: giftFrom(form),
    // The whole point of a box: one price, delivery in it, whichever way it
    // travels. What that is depends on the car, not on the cart.
    fixedFee: going.fee,
  });

  if (!result.ok) return { error: result.error };

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
