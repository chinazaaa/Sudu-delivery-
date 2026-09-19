import { pickOffer, type LiveOffer, type OfferContext } from "./offers";
import { db } from "./supabase";
import { naira } from "./money";
import { SLOT_LABEL, type BatchSlot } from "./config";
import { runDateLabel } from "./time";

export type Coupon = {
  code: string;
  applies_to: "delivery" | "order" | "fee";
  amount: number;
  note: string;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used: number;
  first_order_only: boolean;
  /** Applies itself, with nothing to type. A promotion rather than a code. */
  automatic: boolean;
  /** How many items the headline price covers. Null is flat, for ever. */
  included_items: number | null;
  /** What each item beyond that adds. */
  extra_per_item: number;
  /** Same day windows it is good for, as start hours: "12,15". */
  windows: string;
};

export type CouponWithRuns = Coupon & {
  /** The runs it works on. Empty means every run. */
  runs: { batchId: string; label: string }[];
  /** The restaurants it works on. Empty means anywhere. */
  places: { id: string; name: string }[];
};

/**
 * The restaurants a code is tied to, or an empty list for a code tied to
 * none.
 *
 * A missing table reads as no restriction rather than as an error, so a
 * deploy that lands before the SQL does leaves every existing code working
 * exactly as it did.
 */
export async function couponPlaces(code: string): Promise<string[]> {
  try {
    const { data, error } = await db()
      .from("coupon_restaurants")
      .select("restaurant_id")
      .eq("coupon_code", code);
    if (error) return [];
    return (data ?? []).map((row) => row.restaurant_id as string);
  } catch {
    return [];
  }
}


/**
 * Every promotion that is on today, with its rules.
 *
 * Expiry, the cap and the on switch are settled here because they are facts
 * about the offer rather than about the cart. What is left is judged against
 * the cart, on whichever side is asking.
 */
export async function liveOffers(): Promise<LiveOffer[]> {
  let offers: Coupon[] = [];
  try {
    const { data, error } = await db()
      .from("coupons")
      .select("*")
      .eq("automatic", true)
      .eq("active", true);
    if (error) return [];
    offers = (data ?? []) as Coupon[];
  } catch {
    return [];
  }

  const now = new Date();
  const live = offers.filter(
    (coupon) =>
      coupon.applies_to === "fee" &&
      !(coupon.expires_at && new Date(coupon.expires_at) <= now) &&
      !(coupon.max_uses !== null && coupon.used >= coupon.max_uses)
  );
  if (live.length === 0) return [];

  const codes = live.map((coupon) => coupon.code);
  const [{ data: places }, { data: runs }] = await Promise.all([
    db().from("coupon_restaurants").select("coupon_code, restaurant_id").in("coupon_code", codes),
    db().from("coupon_runs").select("coupon_code, batch_id").in("coupon_code", codes),
  ]);

  return live.map((coupon) => ({
    code: coupon.code,
    note: coupon.note,
    fee: coupon.amount,
    includedItems: coupon.included_items,
    extraPerItem: coupon.extra_per_item ?? 0,
    places: (places ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => row.restaurant_id as string),
    runs: (runs ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => row.batch_id as string),
    windows: (coupon.windows ?? "")
      .split(",")
      .map((one) => Number(one.trim()))
      .filter((one) => Number.isFinite(one)),
    firstOrderOnly: coupon.first_order_only,
  }));
}

/** The promotion on an order, read and judged in one go, for the server. */
export async function activePromotion(
  context: OfferContext
): Promise<{ coupon: { code: string; note: string }; fee: number } | null> {
  const found = pickOffer(await liveOffers(), context);
  return found ? { coupon: { code: found.offer.code, note: found.offer.note }, fee: found.fee } : null;
}

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

/** Restaurant names, for saying what a code is actually for. */
async function placeNames(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  try {
    const { data } = await db().from("restaurants").select("name").in("id", ids);
    return (data ?? []).map((row) => row.name as string);
  } catch {
    return [];
  }
}

/**
 * A discount code, checked against the order it is being used on. Nothing here
 * touches the promoter: a code is a thing to put in a group chat on a slow
 * night, not a way of counting who brought whom.
 */
export async function checkCoupon(args: {
  code: string;
  fee: number;
  food: number;
  returning: boolean;
  /** The run being ordered into, for a code tied to particular ones. */
  batchId: string;
  /** Every restaurant the cart draws on, for a code tied to one kitchen. */
  restaurantIds?: string[];
}): Promise<CouponCheck> {
  const wanted = args.code.trim().toUpperCase();
  if (!wanted) return { ok: false, error: "Enter a code." };

  const { data } = await db()
    .from("coupons")
    .select("*")
    .eq("code", wanted)
    .maybeSingle();

  const coupon = data as Coupon | null;
  if (!coupon || !coupon.active) {
    return { ok: false, error: "That code is not in use." };
  }
  // A promotion applies itself. Typing its name is not how it is claimed, and
  // letting somebody type it would be the offer landing twice.
  if (coupon.automatic || coupon.applies_to === "fee") {
    return { ok: false, error: "That one applies by itself, with nothing to type." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return { ok: false, error: "That code has expired." };
  }
  if (coupon.max_uses !== null && coupon.used >= coupon.max_uses) {
    return { ok: false, error: "That code has been used up." };
  }
  if (coupon.first_order_only && args.returning) {
    return { ok: false, error: "That code is for a first order only." };
  }

  // A code tied to particular runs works on those and nowhere else. No rows
  // at all means it works on any run.
  const { data: runs } = await db()
    .from("coupon_runs")
    .select("batch_id")
    .eq("coupon_code", coupon.code);

  if ((runs ?? []).length > 0 && !runs!.some((row) => row.batch_id === args.batchId)) {
    return { ok: false, error: "That code is not for this run." };
  }

  // A code tied to a kitchen is a deal with that kitchen, so the whole cart
  // has to come from it. Domino's and a shawarma is the code paying for the
  // shawarma as well, which is not what was agreed, and it is refused rather
  // than quietly discounted.
  const places = await couponPlaces(coupon.code);
  if (places.length > 0) {
    const cart = [...new Set(args.restaurantIds ?? [])];
    const outside = cart.filter((id) => !places.includes(id));
    if (cart.length === 0 || outside.length > 0) {
      const names = await placeNames(places);
      const only =
        names.length === 1
          ? names[0]
          : names.length > 1
            ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`
            : "one restaurant";
      return {
        ok: false,
        error:
          outside.length > 0 && cart.length > outside.length
            ? `That code is only for ${only}, so it cannot be used on a cart with anything else in it.`
            : `That code is only for ${only}.`,
      };
    }
  }

  // Delivery codes never pay out more than the delivery being charged: "free
  // delivery" on a ₦2,000 top-up is ₦2,000 off, not ₦4,000.
  const ceiling = coupon.applies_to === "delivery" ? args.fee : args.food + args.fee;
  const discount = Math.min(coupon.amount, ceiling);

  if (discount <= 0) {
    return {
      ok: false,
      error:
        coupon.applies_to === "delivery"
          ? "There is no delivery on this order to take off."
          : "There is nothing to take off this order.",
    };
  }

  return { ok: true, coupon, discount };
}

/** Counts a use, once the order it was used on exists. */
export async function useCoupon(code: string): Promise<void> {
  const { data } = await db()
    .from("coupons")
    .select("used")
    .eq("code", code)
    .maybeSingle();
  if (!data) return;

  await db()
    .from("coupons")
    .update({ used: (data.used as number) + 1 })
    .eq("code", code);
}

/** What a code is worth, in words, for the box the customer types it into. */
export function couponLabel(coupon: Coupon): string {
  if (coupon.applies_to === "fee") {
    const taper =
      coupon.included_items !== null && coupon.extra_per_item > 0
        ? `, ${naira(coupon.extra_per_item)} an item after ${coupon.included_items}`
        : "";
    return `delivery is ${naira(coupon.amount)}${taper}`;
  }
  return coupon.applies_to === "delivery"
    ? `${naira(coupon.amount)} off delivery`
    : `${naira(coupon.amount)} off the order`;
}

export async function listCoupons(): Promise<CouponWithRuns[]> {
  const { data, error } = await db()
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const coupons = (data ?? []) as Coupon[];
  if (coupons.length === 0) return [];

  const { data: links } = await db()
    .from("coupon_runs")
    .select("coupon_code, batch_id");
  const batchIds = [...new Set((links ?? []).map((row) => row.batch_id as string))];

  const { data: batches } = batchIds.length
    ? await db().from("batches").select("id, run_date, slot").in("id", batchIds)
    : { data: [] };
  const labels = new Map(
    ((batches ?? []) as any[]).map((batch) => [
      batch.id as string,
      `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot as BatchSlot]}`,
    ])
  );

  // Which kitchens each code is kept to. Read separately and forgivingly:
  // before the table exists every code is simply tied to nowhere.
  let ties: { coupon_code: string; restaurant_id: string }[] = [];
  let names = new Map<string, string>();
  try {
    const { data: rows } = await db()
      .from("coupon_restaurants")
      .select("coupon_code, restaurant_id");
    ties = (rows ?? []) as typeof ties;
    const placeIds = [...new Set(ties.map((row) => row.restaurant_id))];
    if (placeIds.length > 0) {
      const { data: places } = await db()
        .from("restaurants")
        .select("id, name")
        .in("id", placeIds);
      names = new Map(((places ?? []) as any[]).map((one) => [one.id as string, one.name as string]));
    }
  } catch {
    /* No table yet, so no code is tied to anywhere. */
  }

  return coupons.map((coupon) => ({
    ...coupon,
    runs: (links ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => ({
        batchId: row.batch_id as string,
        label: labels.get(row.batch_id as string) ?? "A past run",
      })),
    places: ties
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => ({
        id: row.restaurant_id,
        name: names.get(row.restaurant_id) ?? "A restaurant",
      })),
  }));
}

/** A code announced on the site, as the strip along the top states it. */
export type PublicOffer = { code: string; line: string; automatic?: boolean };

/**
 * The offer worth announcing, if there is one.
 *
 * It reads the code rather than trusting a sentence typed beside it, so the
 * strip cannot go on promising ₦500 off after the code has been switched off,
 * run out, expired, or had its amount changed. Nothing to remember to take
 * down.
 */
export async function publicOffer(code: string): Promise<PublicOffer | null> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;

  try {
    const { data } = await db()
      .from("coupons")
      .select("*")
      .eq("code", wanted)
      .maybeSingle();

    const coupon = data as Coupon | null;
    if (!coupon || !coupon.active) return null;
    if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) return null;
    if (coupon.max_uses !== null && coupon.used >= coupon.max_uses) return null;

    const what =
      coupon.applies_to === "fee"
        ? `${naira(coupon.amount)} delivery`
        : coupon.applies_to === "delivery"
          ? `${naira(coupon.amount)} off delivery`
          : `${naira(coupon.amount)} off`;

    // A code kept to one kitchen says so in the strip. Announcing "₦500 off"
    // to the whole site and then refusing it at the counter is the sort of
    // thing people remember.
    const names = await placeNames(await couponPlaces(coupon.code));
    const where = names.length > 0 ? ` at ${names.join(" or ")}` : "";

    return {
      code: coupon.code,
      line: coupon.first_order_only ? `${what} your first order${where}` : `${what}${where}`,
      automatic: coupon.automatic,
    };
  } catch {
    // A code nobody can read is a code nobody is offered. The site is fine.
    return null;
  }
}

/**
 * The promotion on each restaurant today, keyed by restaurant.
 *
 * The home page is already a busy place, so an offer announces itself where
 * the food is: a badge on that restaurant's card and a line at the top of its
 * own page. An offer tied to no restaurant is not here, because there is no
 * one page it belongs on.
 */
export async function offersByRestaurant(): Promise<Map<string, LiveOffer>> {
  const out = new Map<string, LiveOffer>();
  for (const offer of await liveOffers()) {
    for (const place of offer.places) {
      if (!out.has(place)) out.set(place, offer);
    }
  }
  return out;
}
