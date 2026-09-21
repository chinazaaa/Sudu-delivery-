"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrder, moveOrder, orderLinkId, placeOrder, previewCoupon, saveRating } from "@/lib/orders";
import { lastOrderForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { rememberCart } from "@/lib/carts";
import { countCheckoutLinkUse, getCheckoutLink } from "@/lib/checkout-links";
import { arrivalNow } from "@/lib/arrival-server";
import { OPENED, sprung, tooFast, TRAP } from "@/lib/guard";
import { dropBatch, skincareFee } from "@/lib/skincare";
import { safeSettings } from "@/lib/settings";
import { db } from "@/lib/supabase";
import { closeGroup, getSharedGroup, groupOrders, leaderSeat } from "@/lib/groups";
import { groupCarts } from "@/lib/group-carts";
import { shortRef } from "@/lib/links";
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
  // Two things no person does: fill in a field they cannot see, and finish
  // a checkout in three seconds. Either one is a script, and what it costs
  // is a run sheet full of orders nobody placed and a real order buried in
  // an inbox of fake ones.
  //
  // Said as a plain refusal rather than a quiet success. A script learns
  // nothing from it either way, and if this ever catches a real person, a
  // sentence they can read beats an order that vanished.
  if (sprung(form.get(TRAP)) || tooFast(form.get(OPENED))) {
    return { error: "That did not go through. Give it a moment and try again." };
  }

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
    // Who they say they heard about us from. Checked against the promoters
    // table on the way in, because a code off a form is not a promoter.
    heardFrom: String(form.get("heard_from") ?? "").trim(),
    // Buying it for somebody else. The payer stays the customer and keeps
    // every message about money; this is only who the driver rings.
    giftTo: giftFrom(form),
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
  redirect(`/o/${await orderLinkId(result.orderId)}?placed=1`);
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
  redirect(`/o/${await orderLinkId(result.orderId)}?placed=1`);
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
  me: { name: string; hostel: string; paymentMethod?: "transfer" | "card" } | null;
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

/**
 * Ordering off a link somebody was sent.
 *
 * The food, the run and the delivery fee were settled by whoever made the
 * link. This adds the only things it cannot know: who they are, where it goes
 * and how they are paying. Everything else goes down the ordinary path, so
 * the menu prices it, coupons are checked, and the customer is bound and
 * given their PIN exactly as any other order is.
 */
export async function orderFromLink(input: {
  code: string;
  name: string;
  phone: string;
  hostel: string;
  note: string;
  paymentMethod: "transfer" | "card";
  /** Which of the things on offer they are having: nought is the basket the
   *  link came with, and anything else is one of its swaps. */
  instead?: number;
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const link = await getCheckoutLink(input.code);
  if (!link || !link.active) {
    return { ok: false, error: "That link has been stopped." };
  }

  // The food they picked, chosen here rather than sent from the browser: a
  // page can say anything, and a swap is only a swap because the shop said
  // it costs the same.
  const wanted = Number(input.instead ?? 0);
  const swap = wanted > 0 ? link.alternatives[wanted - 1] : null;
  if (wanted > 0 && !swap) {
    return { ok: false, error: "That choice is not on this link any more." };
  }
  const lines = swap ? [swap] : link.lines;

  // Whatever is going soonest when they tap it: a run while one is still
  // taking orders, a car of its own within the three hours it takes, else
  // tomorrow. A link the admin pinned before links stopped being pinned is
  // honoured while it is live and quietly let go when it is not, because
  // refusing an order over a time nobody chose is a dead end where there is
  // always a next way to eat.
  const going = await arrivalNow({ batchId: link.batch_id, deliverAt: link.deliver_at });

  if (!going) {
    return { ok: false, error: "Nothing is going just now. Try again shortly." };
  }

  const result = await placeOrder({
    batchId: going.runId,
    deliverAt: going.at || undefined,
    name: input.name,
    phone: input.phone,
    hostel: input.hostel,
    lines,
    coupon: link.coupon_code ?? undefined,
    paymentMethod: input.paymentMethod,
    customerNote: input.note,
    // What whoever made the link said delivery costs on this one. Left alone,
    // the ordinary rules price it, promotions and all.
    fixedFee: link.fee ?? undefined,
  });

  if (!result.ok) return { ok: false, error: result.error };

  // The card link, so paying by card needs no message. Written onto the order
  // rather than shown here, because the order page is where somebody comes
  // back to pay.
  if (link.payment_link !== "" && input.paymentMethod === "card") {
    await db()
      .from("orders")
      .update({ payment_link: link.payment_link })
      .eq("id", result.orderId);
  }

  await countCheckoutLinkUse(link.id);
  revalidatePath("/admin", "layout");

  return { ok: true, orderId: await orderLinkId(result.orderId) };
}

/**
 * The leader closing it by hand, rather than waiting out the clock.
 *
 * Gives back what happened. It used to return nothing at all, so a close that
 * was refused, by the seat check or by the orders themselves, left the button
 * reading "Closing…" for ever with no way to know why.
 */
export async function closeSharedGroup(
  form: FormData
): Promise<{ ok: boolean; error?: string; orderId?: string }> {
  const id = String(form.get("group_id") ?? "");
  if (!id) return { ok: false, error: "That group could not be found." };

  // Only the person whose group it is. This was not checked at all: the page
  // decided who the leader was and the server took its word for it, so
  // anybody who knew a group id could price everybody in it and shut them
  // out. The leader took the first seat when they made the link, and the
  // cookie holding that seat is what proves it.
  const seat = (await cookies()).get("sudu_seat")?.value ?? "";
  const leader = await leaderSeat(id);
  if (leader !== "" && seat !== leader) {
    return {
      ok: false,
      error: "Only whoever started this group can close it. The clock will close it anyway.",
    };
  }

  // Whose number this seat gave, read before the close, because closing
  // turns the seats into orders and deletes them. It is how the order that
  // came out of this person's food is found again a moment later.
  const group = await getSharedGroup(id);
  const mine = group
    ? (await groupCarts(group.id)).find((cart) => cart.member_token === seat)
    : undefined;
  const phone = mine?.phone ?? "";

  const result = await closeGroup(id);
  revalidatePath(`/g/${id}`);
  revalidatePath("/o", "layout");
  if (!result.ok) return { ok: false, error: result.error };

  // Their own order, so closing can put them on the page that asks them to
  // pay rather than on a board they have finished with.
  const theirs =
    group && phone
      ? (await groupOrders(group.id)).find((order) => order.customer_phone === phone)
      : undefined;

  return { ok: true, orderId: theirs ? shortRef(theirs) : undefined };
}

/**
 * A skincare order: one flat fee, and the next Saturday.
 *
 * It goes through the same placeOrder as everything else, because everything
 * downstream, the payment, the order page, the admin, already understands an
 * order and has no reason to learn about skincare. What is different is only
 * which car it is on and what delivery costs, and both are decided here.
 */
export async function placeSkincareOrder(input: {
  lines: { id: string; qty: number }[];
  name: string;
  phone: string;
  hostel: string;
  note: string;
  paymentMethod: "transfer" | "card";
}): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const settings = await safeSettings();
  if (settings.skincare_on !== "on") {
    return { ok: false, error: "The skincare shop is closed just now." };
  }

  const lines = input.lines
    .filter((one) => one.id !== "" && one.qty > 0)
    .map((one) => ({ menu_item_id: one.id, qty: Math.min(20, Math.round(one.qty)) }));
  if (lines.length === 0) return { ok: false, error: "There is nothing in the basket." };

  // A block on campus, or an address in Lagos. Food goes to PAU and nowhere
  // else because it is fetched hot and driven straight over; a parcel on a
  // weekly car can go to a house without the day being any different. What
  // it cannot be is three characters somebody typed to get past the form,
  // because the driver has to find it on Saturday.
  const goesTo = input.hostel.trim();
  if (goesTo.length < 2) {
    return { ok: false, error: "We need somewhere to bring it: your block, or your address." };
  }

  // The car for the next drop, made if it is not there yet. Everybody who
  // ordered for that Saturday is in this one, which is what makes one flat
  // fee honest.
  const car = await dropBatch(settings);
  if (!car) {
    return { ok: false, error: "Could not open Saturday's delivery. Try again shortly." };
  }

  const result = await placeOrder({
    batchId: car.id,
    name: input.name,
    phone: input.phone,
    hostel: goesTo,
    lines,
    paymentMethod: input.paymentMethod,
    customerNote: input.note,
    // Priced by the skincare ladder, which is its own: it is the car, not
    // the cream, so it goes by how much room the order takes.
    fixedFee: skincareFee(
      settings,
      lines.reduce((count, one) => count + one.qty, 0)
    ),
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin", "layout");
  return { ok: true, orderId: await orderLinkId(result.orderId) };
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
