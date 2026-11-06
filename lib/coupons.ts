import { unstable_cache } from "next/cache";
import {
  choiceCombinations,
  choiceLabels,
  choiceSets,
  dayMatches,
  offerBadge,
  offerLine,
  pickOffer,
  seasonCovers,
  type LiveOffer,
  type OfferContext,
} from "./offers";
import { db } from "./supabase";
import { activeBands } from "./settings";
import { headlineFee, type Band } from "./fees";
import { naira } from "./money";
import { SLOT_LABEL, type BatchSlot } from "./config";
import { lagosToday, runDateLabel } from "./time";

export type Coupon = {
  code: string;
  /**
   * What the offer is about, in the shop's own words.
   *
   * Listing the counters says who is in it and nothing about what it is.
   * The Friday offer is pizza and ice cream, and that is the phrase a
   * customer is meant to carry around, not four shop signs. Empty falls
   * back to the names, which is every offer nobody has worded.
   */
  headline?: string;
  applies_to: "delivery" | "order" | "fee";
  amount: number;
  note: string;
  active: boolean;
  expires_at: string | null;
  /**
   * The moment it starts working.
   *
   * Null is every code there has ever been: live as soon as it is switched
   * on. A date here is for an offer with a day of its own, Black Friday
   * being the reason this exists: it is set up in advance and switches
   * itself on at midnight, rather than waiting for somebody to remember at
   * seven in the morning on the one day it matters.
   */
  starts_at: string | null;
  max_uses: number | null;
  used: number;
  first_order_only: boolean;
  /** Applies itself, with nothing to type. A promotion rather than a code. */
  automatic: boolean;
  /** How many items the headline price covers. Null is flat, for ever. */
  included_items: number | null;
  /** What each item beyond that adds. */
  extra_per_item: number;

  /** A choice every line must have made, by name: "Large". */
  required_choice: string;
  /** Whether the offer reaches a car somebody has to themselves. */
  same_day: boolean;
  /** In a group, the least any one person pays once it is split. */
  min_per_person: number;
};

export type CouponWithRuns = Coupon & {
  /** The dishes it is for. Empty means it is not about dishes. */
  dishes: { id: string; name: string; restaurant: string }[];
  /** The menu sections it covers, which resolve to dishes when it is read. */
  sections: { id: string; name: string; restaurant: string }[];
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
/**
 * Whether a code is inside its own window right now.
 *
 * One reading of the two dates, used everywhere, because this is asked in
 * five places and five copies of it is how a code ends up live on the
 * offer strip and refused at the till.
 */
export function inSeason(
  coupon: {
    starts_at?: string | null;
    expires_at: string | null;
    on_days?: string | null;
  },
  now: Date = new Date(),
  /*
   * `anyDay` leaves the day test to whoever knows the delivery date.
   *
   * The dates are about the promotion's own run and are rightly read off
   * the clock. The days are about when the food arrives, which this
   * cannot know: liveOffers is asked without a cart, so a Friday offer
   * has to survive being asked on Thursday or it never reaches the
   * checkout to be judged against Friday's run. See dayMatches.
   */
  opts: { anyDay?: boolean } = {}
): boolean {
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return false;
  if (coupon.expires_at && new Date(coupon.expires_at) <= now) return false;
  return opts.anyDay === true || onItsDay(coupon.on_days, now);
}

/** The days of the week an offer can be pinned to, as they are stored. */
export const OFFER_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** What each is called on the form. */
export const DAY_SAID: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/**
 * Whether today is one of the days this offer runs on.
 *
 * In Lagos, not wherever the server is. An offer for Saturday that comes
 * on at one in the morning because a machine in Virginia thinks it is
 * already Saturday is an offer running on Friday night, and the one in
 * the shop who finds out is whoever is paying for it.
 *
 * No days named means every day, which is what every offer written
 * before this did and goes on doing. A list nobody can read means every
 * day as well: an offer that quietly stops applying is harder to notice
 * than one that applies too often, and both are a conversation, but only
 * the first one happens in silence.
 */
export function onItsDay(
  onDays: string | null | undefined,
  now: Date = new Date()
): boolean {
  const wanted = String(onDays ?? "")
    .toLowerCase()
    .split(",")
    .map((one) => one.trim())
    .filter((one) => (OFFER_DAYS as readonly string[]).includes(one));
  if (wanted.length === 0) return true;

  const today = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
  })
    .format(now)
    .slice(0, 3)
    .toLowerCase();

  return wanted.includes(today);
}

/** The days an offer runs on, said for a person: "Fridays", "Saturdays and
 *  Sundays", or nothing at all when it runs every day. */
export function daysSaid(onDays: string | null | undefined): string {
  const named = String(onDays ?? "")
    .toLowerCase()
    .split(",")
    .map((one) => one.trim())
    .filter((one) => (OFFER_DAYS as readonly string[]).includes(one));
  if (named.length === 0 || named.length === 7) return "";

  const words = OFFER_DAYS.filter((day) => named.includes(day)).map(
    (day) => `${DAY_SAID[day]}s`
  );
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

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
  /*
   * Only what could never apply is dropped here.
   *
   * The dates and the days are both about the day the food arrives, and
   * this is asked without a cart, so neither can be settled yet: an
   * offer that starts tomorrow has to survive being asked about today or
   * it never reaches the checkout to be judged against tomorrow's run.
   * One already over is the exception, since every delivery still to be
   * made is after now. pickOffer does the real test.
   */
  const live = offers.filter(
    (coupon) =>
      coupon.applies_to === "fee" &&
      !(coupon.expires_at && new Date(coupon.expires_at) <= now) &&
      !(coupon.max_uses !== null && coupon.used >= coupon.max_uses)
  );
  if (live.length === 0) return [];

  const codes = live.map((coupon) => coupon.code);
  const [{ data: places }, { data: runs }, dishes, sections] = await Promise.all([
    db().from("coupon_restaurants").select("coupon_code, restaurant_id").in("coupon_code", codes),
    db().from("coupon_runs").select("coupon_code, batch_id").in("coupon_code", codes),
    // Newest of the three, so read forgivingly: without the table no offer is
    // about particular dishes, which is what they all were yesterday.
    (async () => {
      try {
        const { data, error } = await db()
          .from("coupon_items")
          .select("coupon_code, menu_item_id")
          .in("coupon_code", codes);
        return error ? [] : ((data ?? []) as { coupon_code: string; menu_item_id: string }[]);
      } catch {
        return [] as { coupon_code: string; menu_item_id: string }[];
      }
    })(),
    // A whole section of a menu, resolved to its dishes here rather than
    // stored as a list: a pizza added next week is in the offer without
    // anybody remembering to add it.
    (async () => {
      try {
        const { data, error } = await db()
          .from("coupon_categories")
          .select("coupon_code, category_id")
          .in("coupon_code", codes);
        return error ? [] : ((data ?? []) as { coupon_code: string; category_id: string }[]);
      } catch {
        return [] as { coupon_code: string; category_id: string }[];
      }
    })(),
  ]);

  // Every dish in the sections those offers name.
  const inSection = new Map<string, string[]>();
  if (sections.length > 0) {
    const categoryIds = [...new Set(sections.map((row) => row.category_id))];
    const { data: items } = await db()
      .from("menu_items")
      .select("id, category_id")
      .in("category_id", categoryIds);
    for (const item of (items ?? []) as any[]) {
      const key = item.category_id as string;
      inSection.set(key, [...(inSection.get(key) ?? []), item.id as string]);
    }
  }

  return live.map((coupon) => ({
    code: coupon.code,
    note: coupon.note,
    headline: String((coupon as { headline?: string | null }).headline ?? "").trim(),
    // Carried through rather than tested here: only the cart knows which
    // day the food lands on.
    onDays: (coupon as { on_days?: string | null }).on_days ?? "",
    startsAt: coupon.starts_at,
    expiresAt: coupon.expires_at,
    fee: coupon.amount,
    includedItems: coupon.included_items,
    extraPerItem: coupon.extra_per_item ?? 0,
    places: (places ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => row.restaurant_id as string),
    // Named dishes win over a section. They are the narrower answer and the
    // one somebody went to the trouble of picking, and adding them to a
    // section quietly widened the offer to the whole section instead.
    items: (() => {
      const named = dishes
        .filter((row) => row.coupon_code === coupon.code)
        .map((row) => row.menu_item_id);
      if (named.length > 0) return [...new Set(named)];

      return [
        ...new Set(
          sections
            .filter((row) => row.coupon_code === coupon.code)
            .flatMap((row) => inSection.get(row.category_id) ?? [])
        ),
      ];
    })(),
    choice: coupon.required_choice ?? "",
    runs: (runs ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => row.batch_id as string),
    sameDay: coupon.same_day ?? false,
    firstOrderOnly: coupon.first_order_only,
    minEach: coupon.min_per_person ?? 0,
  }));
}

/** The promotion on an order, read and judged in one go, for the server. */
/**
 * Whether there is a code anybody could type in right now.
 *
 * Asked by the chat before it asks for one. A box for a discount code on
 * an order when the shop has no codes at all is a box that can only ever
 * say no: it reads as something being withheld, and the honest answer is
 * not to ask. So the question appears on the nights there is a code and
 * stays away on the nights there is not.
 *
 * Typed-in codes only. An automatic offer applies itself and is already on
 * the bill by the time anybody sees it, and counting those would put the
 * box back on every night for nothing.
 */
export async function anyCodeToType(): Promise<boolean> {
  try {
    const { data, error } = await db()
      .from("coupons")
      .select("starts_at, expires_at, max_uses, used")
      .eq("active", true)
      .eq("automatic", false);
    if (error) return false;

    const now = new Date();
    return (data ?? []).some(
      (row) =>
        inSeason(
          row as {
            starts_at?: string | null;
            expires_at: string | null;
            on_days?: string | null;
          },
          now
        ) &&
        !(row.max_uses !== null && Number(row.used ?? 0) >= Number(row.max_uses))
    );
  } catch {
    return false;
  }
}

export async function activePromotion(
  context: OfferContext
): Promise<{ offer: LiveOffer; coupon: { code: string; note: string }; fee: number } | null> {
  const found = pickOffer(await liveOffers(), context);
  return found
    ? {
        offer: found.offer,
        coupon: { code: found.offer.code, note: found.offer.note },
        fee: found.fee,
      }
    : null;
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
  if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
    return { ok: false, error: "That one is not on yet. Try it again on the day." };
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
    if (coupon.amount === 0) return "Free delivery";
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

  // The dishes an offer names, with something readable to show for them.
  let dishTies: { coupon_code: string; menu_item_id: string }[] = [];
  const dishNamed = new Map<string, { name: string; restaurant: string }>();
  try {
    const { data: rows } = await db().from("coupon_items").select("coupon_code, menu_item_id");
    dishTies = (rows ?? []) as typeof dishTies;
    const ids = [...new Set(dishTies.map((row) => row.menu_item_id))];
    if (ids.length > 0) {
      const { data: items } = await db()
        .from("menu_items")
        .select("id, name, restaurant_id")
        .in("id", ids);
      const placeIds = [...new Set(((items ?? []) as any[]).map((one) => one.restaurant_id))];
      const { data: shops } = placeIds.length
        ? await db().from("restaurants").select("id, name").in("id", placeIds)
        : { data: [] };
      const shopNamed = new Map(((shops ?? []) as any[]).map((one) => [one.id, one.name as string]));
      for (const item of (items ?? []) as any[]) {
        dishNamed.set(item.id as string, {
          name: item.name as string,
          restaurant: shopNamed.get(item.restaurant_id) ?? "",
        });
      }
    }
  } catch {
    /* No table yet, so no offer is about a dish. */
  }

  // The sections an offer covers, for the same reason.
  let sectionTies: { coupon_code: string; category_id: string }[] = [];
  const sectionNamed = new Map<string, { name: string; restaurant: string }>();
  try {
    const { data: rows } = await db()
      .from("coupon_categories")
      .select("coupon_code, category_id");
    sectionTies = (rows ?? []) as typeof sectionTies;
    const ids = [...new Set(sectionTies.map((row) => row.category_id))];
    if (ids.length > 0) {
      const { data: cats } = await db()
        .from("menu_categories")
        .select("id, name, restaurant_id")
        .in("id", ids);
      const placeIds = [...new Set(((cats ?? []) as any[]).map((one) => one.restaurant_id))];
      const { data: shops } = placeIds.length
        ? await db().from("restaurants").select("id, name").in("id", placeIds)
        : { data: [] };
      const shopNamed = new Map(((shops ?? []) as any[]).map((one) => [one.id, one.name as string]));
      for (const cat of (cats ?? []) as any[]) {
        sectionNamed.set(cat.id as string, {
          name: cat.name as string,
          restaurant: shopNamed.get(cat.restaurant_id) ?? "",
        });
      }
    }
  } catch {
    /* No table yet, so no offer covers a section. */
  }

  return coupons.map((coupon) => ({
    ...coupon,
    runs: (links ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => ({
        batchId: row.batch_id as string,
        label: labels.get(row.batch_id as string) ?? "A past run",
      })),
    sections: sectionTies
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => ({
        id: row.category_id,
        name: sectionNamed.get(row.category_id)?.name ?? "A section",
        restaurant: sectionNamed.get(row.category_id)?.restaurant ?? "",
      })),
    dishes: dishTies
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => ({
        id: row.menu_item_id,
        name: dishNamed.get(row.menu_item_id)?.name ?? "A dish",
        restaurant: dishNamed.get(row.menu_item_id)?.restaurant ?? "",
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
/**
 * What a code is worth, as a sentence somebody reads.
 *
 * Written out whole rather than as a phrase with "your first order" stuck on
 * the end, which used to read "₦500 off delivery your first order".
 */
export function offerWording(coupon: Coupon): string {
  const money = naira(coupon.amount);
  const once = coupon.first_order_only;

  if (coupon.applies_to === "fee") {
    if (coupon.amount === 0) return once ? "Free first delivery" : "Free delivery";
    return once ? `${money} delivery on your first order` : `${money} delivery`;
  }
  if (coupon.applies_to === "delivery") {
    return once ? `${money} off your first delivery` : `${money} off delivery`;
  }
  return once ? `${money} off your first order` : `${money} off`;
}

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
    if (!inSeason(coupon)) return null;
    if (coupon.max_uses !== null && coupon.used >= coupon.max_uses) return null;

    const what = offerWording(coupon);

    // A code kept to one kitchen says so in the strip. Announcing "₦500 off"
    // to the whole site and then refusing it at the counter is the sort of
    // thing people remember.
    const names = await placeNames(await couponPlaces(coupon.code));
    const where = names.length > 0 ? ` at ${names.join(" or ")}` : "";

    return {
      code: coupon.code,
      line: `${what}${where}`,
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

/** One deal, said the way somebody standing in a menu would want it said. */
export type Deal = {
  title: string;
  detail: string;
  /** Present when there is something to type. */
  code?: string;
};

/**
 * Everything on offer at one restaurant, in one list.
 *
 * Scattered across a badge, a banner and a strip, an offer is something
 * people find by accident. This is the place to look: the free delivery, the
 * price on the whole kitchen, the code somebody was sent in a group chat, and
 * what each of them actually asks of you.
 */
export async function dealsAt(
  restaurantId: string,
  restaurantName: string
): Promise<Deal[]> {
  let coupons: Coupon[] = [];
  try {
    const { data, error } = await db().from("coupons").select("*").eq("active", true);
    if (error) return [];
    coupons = (data ?? []) as Coupon[];
  } catch {
    return [];
  }

  const now = new Date();
  const live = coupons.filter(
    (coupon) =>
      inSeason(coupon, now) &&
      !(coupon.max_uses !== null && coupon.used >= coupon.max_uses)
  );
  if (live.length === 0) return [];

  const codes = live.map((coupon) => coupon.code);
  const { data: places } = await db()
    .from("coupon_restaurants")
    .select("coupon_code, restaurant_id")
    .in("coupon_code", codes);

  let dishes: { coupon_code: string; menu_item_id: string }[] = [];
  const dishNames = new Map<string, string>();
  const dishShop = new Map<string, string>();
  try {
    const { data } = await db().from("coupon_items").select("coupon_code, menu_item_id");
    dishes = (data ?? []) as typeof dishes;
    const ids = [...new Set(dishes.map((row) => row.menu_item_id))];
    if (ids.length > 0) {
      const { data: items } = await db()
        .from("menu_items")
        .select("id, name, restaurant_id")
        .in("id", ids);
      for (const item of (items ?? []) as any[]) {
        dishNames.set(item.id as string, item.name as string);
        dishShop.set(item.id as string, item.restaurant_id as string);
      }
    }
  } catch {
    /* No table yet. */
  }

  // The sections an offer covers, by name, so the sentence can say them.
  let sectionTies: { coupon_code: string; category_id: string }[] = [];
  const sectionNames = new Map<string, string>();
  try {
    const { data } = await db().from("coupon_categories").select("coupon_code, category_id");
    sectionTies = (data ?? []) as typeof sectionTies;
    const ids = [...new Set(sectionTies.map((row) => row.category_id))];
    if (ids.length > 0) {
      const { data: cats } = await db()
        .from("menu_categories")
        .select("id, name, restaurant_id")
        .in("id", ids);
      for (const cat of (cats ?? []) as any[]) {
        if ((cat.restaurant_id as string) === restaurantId) {
          sectionNames.set(cat.id as string, String(cat.name).toLowerCase());
        }
      }
    }
  } catch {
    /* No table yet. */
  }
  const sectionsOf = (code: string) =>
    sectionTies
      .filter((row) => row.coupon_code === code)
      .map((row) => sectionNames.get(row.category_id))
      .filter((name): name is string => Boolean(name));

  const out: Deal[] = [];

  for (const coupon of live) {
    const tiedTo = (places ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => row.restaurant_id as string);
    const named = dishes
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => row.menu_item_id);

    // Theirs if it names this kitchen, or names a dish on this menu. An offer
    // that names neither belongs to the whole shop and is not a deal about
    // this restaurant, so it stays off the list.
    const mineByPlace = tiedTo.includes(restaurantId);
    const mineByDish = named.some((id) => dishShop.get(id) === restaurantId);
    const mineBySection = sectionsOf(coupon.code).length > 0;
    if (!mineByPlace && !mineByDish && !mineBySection) continue;

    const only =
      named.length > 0
        ? named
            .filter((id) => dishShop.get(id) === restaurantId)
            .map((id) => dishNames.get(id) ?? "a dish")
        : [];

    // What actually qualifies, said in full. "Order from Domino's" on an
    // offer that is really about medium pizzas is the kind of half sentence
    // somebody builds a cart on and then feels cheated by.
    const parts = sectionsOf(coupon.code);

    // Spelt out where it can be: a medium BBQ Chicken or a medium BBQ
    // Meatball is two things somebody can picture. Past a handful the list
    // would be longer than the menu, and the conditions are listed instead.
    const combinations = choiceCombinations(coupon.required_choice ?? "");
    const section = parts.length > 0 ? ` ${parts.join(" or ")}` : "";

    // The combinations are only spelt into the noun when the offer is about a
    // section: "any Medium BBQ Chicken pizza" reads, where the same trick on
    // named dishes would give "any Medium BBQ Chicken BBQ Chicken".
    const spelt = only.length === 0 && combinations.length > 0;

    const what =
      only.length > 0
        ? only.join(" or ")
        : spelt
          ? `any ${combinations.join(`${section} or `)}${section} from ${restaurantName}`
          : parts.length > 0
            ? `any ${parts.join(" or ")} from ${restaurantName}`
            : `anything from ${restaurantName}`;

    // Every condition the offer has, said somewhere. Naming the dishes used
    // to drop the size out of the sentence entirely, so an offer good only
    // on the medium read as good on any of them.
    const asked = spelt
      ? []
      : choiceLabels(coupon.required_choice ?? "").map((set) => set.join(" or "));
    const must = asked.length === 0 ? "" : ` It has to be ${asked.join(", and ")}.`;

    const where = `Order ${what}, and nothing else.${must} Then `;

    if (coupon.applies_to === "fee") {
      const taper =
        coupon.amount > 0 && coupon.included_items !== null && coupon.extra_per_item > 0
          ? ` for up to ${coupon.included_items} item${
              coupon.included_items === 1 ? "" : "s"
            }, then ${naira(coupon.extra_per_item)} each`
          : "";
      const split =
        coupon.amount > 0 && coupon.min_per_person > 0
          ? ` In a group it splits, down to ${naira(coupon.min_per_person)} each.`
          : "";

      out.push({
        title: coupon.amount === 0 ? "Free delivery" : `${naira(coupon.amount)} delivery`,
        detail:
          `${where}delivery is ${
            coupon.amount === 0 ? "free" : naira(coupon.amount)
          }${taper}, and it comes off by itself with no code to type.${split}`,
      });
      continue;
    }

    out.push({
      title: couponLabel(coupon),
      detail: `${where}type this at checkout.${
        coupon.first_order_only ? " First order only." : ""
      }`,
      code: coupon.code,
    });
  }

  return out;
}

/**
 * How many of an offer's dishes actually have the choice it asks for.
 *
 * The choice is matched by name, so an offer for Large quietly skips a pizza
 * whose size is called L or 14 inch. Rather than leave that to be discovered
 * on a Friday, admin is told: eleven of twelve, and which one is missing it.
 */
export async function choiceReach(
  itemIds: string[],
  choice: string
): Promise<{ of: number; matched: number; missing: string[] }> {
  const wanted = choiceSets(choice);
  if (wanted.length === 0 || itemIds.length === 0) {
    return { of: itemIds.length, matched: itemIds.length, missing: [] };
  }

  try {
    const { data: groups } = await db()
      .from("item_option_groups")
      .select("id, menu_item_id")
      .in("menu_item_id", itemIds);

    const groupIds = ((groups ?? []) as any[]).map((one) => one.id as string);
    const { data: options } = groupIds.length
      ? await db().from("item_options").select("name, group_id").in("group_id", groupIds)
      : { data: [] };

    const itemOfGroup = new Map(
      ((groups ?? []) as any[]).map((one) => [one.id as string, one.menu_item_id as string])
    );
    // A dish offers the choice when it can answer every question the offer
    // asks: a medium BBQ Chicken needs both a Medium and a BBQ Chicken.
    const offeredBy = new Map<string, Set<string>>();
    for (const option of (options ?? []) as any[]) {
      const item = itemOfGroup.get(option.group_id as string);
      if (!item) continue;
      const names = offeredBy.get(item) ?? new Set<string>();
      names.add(String(option.name).trim().toLowerCase());
      offeredBy.set(item, names);
    }

    const shortIds = itemIds.filter((id) => {
      const names = offeredBy.get(id) ?? new Set<string>();
      return !wanted.every((set) => set.some((one) => names.has(one)));
    });
    const { data: named } = shortIds.length
      ? await db().from("menu_items").select("id, name").in("id", shortIds)
      : { data: [] };

    return {
      of: itemIds.length,
      matched: itemIds.length - shortIds.length,
      missing: ((named ?? []) as any[]).map((one) => one.name as string),
    };
  } catch {
    return { of: itemIds.length, matched: itemIds.length, missing: [] };
  }
}

/**
 * Every choice a menu actually offers, with how many dishes carry it.
 *
 * So a size is picked rather than typed: Domino's calls it Large, Panarottis
 * calls it Standard, and spelling either of them wrong is an offer that
 * quietly never applies. The count is there because Large on twelve dishes
 * and Large on one are different decisions.
 */
export async function menuChoices(): Promise<
  { name: string; items: number; restaurants: string[] }[]
> {
  try {
    const { data: options } = await db().from("item_options").select("name, group_id");
    if (!options || options.length === 0) return [];

    const groupIds = [...new Set((options as any[]).map((one) => one.group_id as string))];
    const { data: groups } = await db()
      .from("item_option_groups")
      .select("id, menu_item_id")
      .in("id", groupIds);

    const itemOfGroup = new Map(
      ((groups ?? []) as any[]).map((one) => [one.id as string, one.menu_item_id as string])
    );
    const { data: items } = await db()
      .from("menu_items")
      .select("id, restaurant_id")
      .in("id", [...new Set([...itemOfGroup.values()])]);
    const shopOfItem = new Map(
      ((items ?? []) as any[]).map((one) => [one.id as string, one.restaurant_id as string])
    );
    const { data: shops } = await db().from("restaurants").select("id, name");
    const shopNamed = new Map(((shops ?? []) as any[]).map((one) => [one.id as string, one.name as string]));

    // Grouped by how the name reads rather than how it is typed, so one stray
    // capital does not split Large into two entries to choose between.
    const byName = new Map<string, { name: string; items: Set<string>; shops: Set<string> }>();
    for (const option of options as any[]) {
      const name = String(option.name).trim();
      if (name === "") continue;
      const key = name.toLowerCase();
      const item = itemOfGroup.get(option.group_id as string);
      if (!item) continue;

      const entry = byName.get(key) ?? { name, items: new Set<string>(), shops: new Set<string>() };
      entry.items.add(item);
      const shop = shopNamed.get(shopOfItem.get(item) ?? "");
      if (shop) entry.shops.add(shop);
      byName.set(key, entry);
    }

    return [...byName.values()]
      .map((entry) => ({
        name: entry.name,
        items: entry.items.size,
        restaurants: [...entry.shops],
      }))
      .sort((one, two) => two.items - one.items || one.name.localeCompare(two.name));
  } catch {
    return [];
  }
}

/**
 * One counter where a live promotion is on, with the link to its menu.
 *
 * Slug first, because that is what the rest of the site links with, falling
 * back to the id so a restaurant without one is still reachable.
 */
async function placeLinks(
  ids: string[]
): Promise<{ id: string; name: string; href: string }[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await db()
      .from("restaurants")
      .select("id, name, slug")
      .in("id", ids)
      .eq("active", true);
    // An older database has no slug column, and an offer people cannot see
    // is worse than a link that carries a uuid.
    if (error) {
      const { data: plain } = await db()
        .from("restaurants")
        .select("id, name")
        .in("id", ids)
        .eq("active", true);
      return (plain ?? []).map((row) => ({
        id: row.id as string,
        name: row.name as string,
        href: row.id as string,
      }));
    }
    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      href: (row.slug as string | null) || (row.id as string),
    }));
  } catch {
    return [];
  }
}

/** A promotion said the way somebody who has never seen this shop wants it. */
export type Nudge = {
  /** Only ever a key for remembering a dismissal. It is never shown: an
   *  automatic offer has nothing to type and naming a code sends people
   *  looking for a box that is not there. */
  code: string;
  /** "₦2,000 delivery", for the strong line. */
  badge: string;
  /** Where it is on: "Domino's Pizza", or two names joined. */
  where: string;
  /** The small print, in one sentence. */
  detail: string;
  /** Where to send somebody who wants it. One entry per counter, or a single
   *  entry for the whole menu when the offer names no counter. */
  go: { label: string; href: string }[];
  /** Whether today in Lagos is one of the days it runs on. A Friday offer
   *  is a promise about Friday, and the line along the top of the shop is
   *  read by somebody standing in the day it is about. */
  today: boolean;
  /** "Fridays", or empty where it runs every day. */
  days: string;
  /** The day this is about, said for a person: "today", "tomorrow", "on
   *  Saturday", or "Every Friday" for a standing one. Empty where nothing
   *  said which day. */
  said: string;
  /** What it is about in the shop's own words, where it has been worded:
   *  "Pizza and ice cream". Empty falls back to `where`. */
  headline: string;
  /**
   * Whether this is the offer on the next delivery, or a standing promise
   * about a day further out.
   *
   * A shop with nothing on until Friday has a choice between saying
   * nothing and saying what Friday is. Saying it is how somebody learns
   * that Friday is the cheap day, which is worth more than one night's
   * sale: the habit is the point, not the sale.
   */
  standing: boolean;
};

/** Whether a promotion's own dates cover this minute. */
function inSeasonNow(offer: LiveOffer, now: Date = new Date()): boolean {
  if (offer.startsAt) {
    const from = new Date(offer.startsAt);
    if (Number.isFinite(from.getTime()) && from > now) return false;
  }
  if (offer.expiresAt) {
    const to = new Date(offer.expiresAt);
    if (Number.isFinite(to.getTime()) && to <= now) return false;
  }
  return true;
}

/**
 * The next offer there is, and the day it lands on.
 *
 * Not only the weekly ones. Somebody opening the shop on a Saturday with
 * nothing on until Monday should be told about Monday: it is the same
 * question, asked earlier, and the answer builds towards the day instead
 * of waiting for it. A lot of people open the shop and buy nothing, and
 * what they take away from that visit is the only thing this section is
 * for.
 *
 * The soonest day any offer covers, and every offer that covers it, so a
 * day with two on it still picks the cheapest below.
 */
export function comingRound(
  offers: LiveOffer[],
  from: string,
  within = 28
): { offers: LiveOffer[]; day: string } | null {
  const start = new Date(`${from}T12:00:00Z`);
  if (!Number.isFinite(start.getTime())) return null;

  for (let ahead = 1; ahead <= within; ahead++) {
    const day = new Date(start.getTime() + ahead * 86_400_000).toISOString().slice(0, 10);
    const on = offers.filter(
      (one) =>
        dayMatches(one.onDays, day) && seasonCovers(one.startsAt, one.expiresAt, day)
    );
    if (on.length > 0) return { offers: on, day };
  }
  return null;
}

/** "Every Friday", for an offer that comes round every week. Empty for one
 *  that does not, which is said by its date instead. */
export function everySaid(onDays: string | null | undefined): string {
  const named = String(onDays ?? "")
    .toLowerCase()
    .split(",")
    .map((one) => one.trim())
    .filter((one) => (OFFER_DAYS as readonly string[]).includes(one));
  if (named.length === 0 || named.length === 7) return "";

  const words = OFFER_DAYS.filter((day) => named.includes(day)).map((day) => DAY_SAID[day]);
  const list =
    words.length === 1
      ? words[0]
      : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return `Every ${list}`;
}

/**
 * The promotion worth interrupting somebody for, or nothing.
 *
 * Only automatic offers, because those are the ones that need announcing:
 * nobody types them, so nobody finds them unless they are told. The wording
 * is built from the offer itself rather than written anywhere, so an offer
 * that is switched off in admin stops being announced in the same moment.
 */
export async function offerNudge(onDay = ""): Promise<Nudge | null> {
  const offers = await liveOffers();
  if (offers.length === 0) return null;

  /*
   * Only the offers that cover the day the food actually lands.
   *
   * At half past ten on a Friday the Friday run has gone and the soonest
   * delivery is Saturday's, so Friday's offer is not on sale any more and
   * the weekend's is. Judged by the day the food arrives, which is the
   * rule everywhere else and was missing from the one place that
   * announces it. With no day to go on it falls back to the clock, which
   * is right for anything asking without a run in front of it.
   */
  const open = offers.filter(
    (one) =>
      (onDay === "" ? onItsDay(one.onDays) : dayMatches(one.onDays, onDay)) &&
      (onDay === "" ? inSeasonNow(one) : seasonCovers(one.startsAt, one.expiresAt, onDay))
  );

  /*
   * Nothing on the next delivery, so say what is standing instead.
   *
   * A shop with no offer until Friday can say nothing, or it can say what
   * Friday is. Saying it is how somebody comes to know that Friday is the
   * cheap day, which is worth more than any one night's sale. It only
   * speaks for an offer that really will come round again: a weekly one,
   * inside its own dates, with a date ahead of it that it covers.
   */
  const standing = open.length === 0;
  const later = standing ? comingRound(offers, onDay || lagosToday()) : null;
  const picked = standing ? (later?.offers ?? []) : open;
  if (picked.length === 0) return null;

  // The one with the lowest fee is the loudest thing on the shop that day.
  const offer = [...picked].sort((a, b) => a.fee - b.fee)[0];
  const places = await placeLinks(offer.places);

  // The offer names a counter that is switched off. Announcing it would send
  // people to a page that is not there.
  if (offer.places.length > 0 && places.length === 0) return null;

  // At most two names, then a count.
  //
  // It used to join every one of them, so an offer running on seven
  // counters produced "Domino's Pizza, Panarottis, Burger King, Dodo Pizza,
  // Chicken Republic, KFC or Yin Yang Express" as a headline. On a phone
  // that is four lines of bold type, and the card it sits in is a card that
  // covers the restaurants it is advertising. A headline cannot be allowed
  // to grow every time a counter is added to an offer.
  const names = places.map((place) => place.name);
  const rest = names.length - 2;
  const where =
    names.length === 0
      ? ""
      : names.length === 1
        ? names[0]
        : rest > 0
          ? `${names[0]}, ${names[1]} and ${rest} more`
          : `${names[0]} or ${names[1]}`;

  /* The price, and anything that stops it being the price. Nothing else:
     the card has a button on it saying where the offer is on, and a line
     explaining that an automatic offer is automatic is a sentence
     somebody has to read to learn nothing. */
  const detail = [offerLine(offer), offer.firstOrderOnly ? "First order only." : ""]
    .filter(Boolean)
    .join(" ");

  return {
    code: offer.code,
    badge: offerBadge(offer),
    where,
    detail,
    // It reached here, so it covers the day being asked about.
    today: !standing,
    days: daysSaid(offer.onDays),
    /*
     * A weekly offer is said as the habit it is, "Every Friday", because
     * that is the thing worth remembering. One that only happens once is
     * said by its day, "on Monday", because there is no habit to learn.
     */
    said: standing
      ? (comesRoundAgain(offer.onDays, offer.expiresAt, lagosToday(), offer.startsAt)
          ? everySaid(offer.onDays)
          : thisTimeSaid(offer.onDays)) ||
        daySaidFor(later?.day ?? "", lagosToday())
      : daySaidFor(onDay, lagosToday()),
    headline: offer.headline ?? "",
    standing,
    // One button per counter only while there are few enough for that to be
    // a choice. Past two it is a wall of chips naming an arbitrary three of
    // seven places, so it becomes one button to the menu, where all of them
    // are.
    go:
      places.length === 0 || places.length > 2
        ? [
            {
              label: places.length > 2 ? "See where it is on" : "See the menu",
              href: "/products",
            },
          ]
        : places.map((place) => ({
            label: places.length === 1 ? `Order from ${place.name}` : place.name,
            href: `/r/${place.href}`,
          })),
  };
}

/**
 * An offer that is switched on and cannot apply, said out loud.
 *
 * The Friday promotion sat in the list looking healthy: on, automatic,
 * ₦2,000, Fridays. Its expiry was five days gone, so it had quietly
 * stopped working, and the only thing that said so was a customer's cart
 * reading four thousand on the evening the flyer went out.
 *
 * Nothing here is new information: the dates are already on the card.
 * What was missing is the arithmetic, which is the bit nobody does while
 * glancing down a list.
 *
 * Only for offers that are switched on. One that is off is off on
 * purpose, and the page already says so.
 */
export function offerTrouble(
  coupon: {
    active: boolean;
    starts_at?: string | null;
    expires_at: string | null;
    max_uses: number | null;
    used: number;
  },
  now: Date = new Date()
): string {
  if (!coupon.active) return "";

  const said = (iso: string) =>
    new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

  if (coupon.expires_at) {
    const ends = new Date(coupon.expires_at);
    if (Number.isFinite(ends.getTime()) && ends <= now) {
      return `Ended ${said(coupon.expires_at)}. It is switched on but has not applied since.`;
    }
  }

  if (coupon.max_uses !== null && coupon.used >= coupon.max_uses) {
    return `All ${coupon.max_uses} uses are gone. It is switched on but cannot apply again.`;
  }

  return "";
}

/**
 * Every automatic promotion, for pages with no cart on them.
 *
 * The same list liveOffers gives, cached for a minute because the front
 * page asks on every visit and a promotion switched on a minute ago is
 * not an emergency. Nothing is filtered out here on purpose: whether a
 * counter-pinned offer may be shown depends on what the figure claims to
 * be, and only the caller knows that. A field saying "from" is a floor
 * and may reach for it (floorFee); one that reads as the price may not
 * (blanketFee).
 */
async function readOpenOffers(): Promise<LiveOffer[]> {
  return await liveOffers();
}

export const openOffers = unstable_cache(readOpenOffers, ["open-offers"], {
  revalidate: 60,
  tags: ["coupons"],
});

/** A delivery promotion, said for the sale page. */
export type DeliveryOffer = {
  code: string;
  /** What it charges, and what the ladder would have. `was` is zero where
   *  the offer does not actually beat the ladder, and then nothing is
   *  struck out. */
  fee: number;
  was: number;
  /** "Fridays", "Saturdays and Sundays", or empty for every day. */
  days: string;
  /** "2 days left", said the way the counters' own sales say it. Empty
   *  where it has no end on it. */
  left: string;
  /** The counters it covers. Empty means every one of them. */
  places: { id: string; name: string; href: string }[];
  firstOrderOnly: boolean;
};

/**
 * The delivery promotions, for the sale page.
 *
 * The sale page is where somebody goes to see what is cheap today, and
 * until now it only knew about the counters' own price cuts. A delivery
 * offer is the same question answered about the other half of the bill,
 * and leaving it off meant the one page built for the question gave half
 * the answer.
 *
 * Said with the counters named, because almost every one of these is
 * pinned to a few of them: a figure on its own would read as the price
 * from anywhere and send somebody to a counter it was never on.
 */
export async function deliveryOffers(): Promise<DeliveryOffer[]> {
  const [offers, bands] = await Promise.all([
    liveOffers().catch(() => [] as LiveOffer[]),
    activeBands().catch(() => [] as Band[]),
  ]);
  if (offers.length === 0) return [];

  const ladder = headlineFee(bands.length > 0 ? bands : undefined);
  const now = new Date();

  const said = await Promise.all(
    offers.map(async (offer) => {
      const places = await placeLinks(offer.places);
      // Pinned to counters that are all switched off. Showing it would
      // send people to pages that are not there.
      if (offer.places.length > 0 && places.length === 0) return null;
      return {
        code: offer.code,
        fee: offer.fee,
        was: offer.fee < ladder ? ladder : 0,
        /* "Fridays" for a habit, "This Saturday and Sunday only" for an
           offer that happens once: said the same way, a weekend promo
           reads as a standing arrangement. */
        days: comesRoundAgain(offer.onDays, offer.expiresAt, lagosToday(), offer.startsAt)
          ? daysSaid(offer.onDays)
          : thisTimeSaid(offer.onDays),
        left: leftToRun(offer.expiresAt, now),
        places,
        firstOrderOnly: offer.firstOrderOnly,
      };
    })
  );

  // Cheapest first, which is the order a sale is read in.
  return said
    .filter((one): one is DeliveryOffer => one !== null)
    .sort((a, b) => a.fee - b.fee);
}

/**
 * How long a promotion has, said the way the counters' own sales say it.
 *
 * The same wording as a price cut's deadline on purpose: the two sit in
 * one list on the sale page, and two ways of writing the same fact reads
 * as two different kinds of fact.
 */
export function leftToRun(expiresAt: string | null | undefined, now: Date = new Date()): string {
  if (!expiresAt) return "";
  const ends = new Date(expiresAt).getTime();
  if (!Number.isFinite(ends)) return "";
  const left = ends - now.getTime();
  if (left <= 0) return "";

  const minutes = Math.floor(left / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} left`;
}

/**
 * The day the next delivery actually lands.
 *
 * Not today. At half past ten on a Friday night the Friday run has gone
 * and the soonest food anybody can order is Saturday's, so a line saying
 * "two thousand delivery today" is selling something nobody can buy. The
 * offer has to be judged against the day the food arrives, which is the
 * rule everywhere else in the shop and was missing from the one place
 * that announces it.
 *
 * The soonest run whose cut-off has not passed and which is not full.
 * Cached for a minute because every page asks.
 */
async function readNextDeliveryDay(): Promise<string> {
  try {
    const { data, error } = await db()
      .from("batches")
      .select("run_date, cut_off_at, full")
      .gte("cut_off_at", new Date().toISOString())
      .order("run_date", { ascending: true })
      .limit(8);
    if (error) return "";

    const rows = (data ?? []) as { run_date: string; full?: boolean }[];
    const open = rows.find((one) => one.full !== true);
    return open?.run_date ?? "";
  } catch {
    return "";
  }
}

export const nextDeliveryDay = unstable_cache(readNextDeliveryDay, ["next-delivery-day"], {
  revalidate: 60,
  tags: ["batches"],
});

/** "today", "tomorrow", or "on Saturday": the day a promise is about. */
export function daySaidFor(date: string, today: string): string {
  if (date === "" || today === "") return "";
  if (date === today) return "today";
  const at = new Date(`${date}T12:00:00Z`);
  const now = new Date(`${today}T12:00:00Z`);
  if (!Number.isFinite(at.getTime()) || !Number.isFinite(now.getTime())) return "";
  const days = Math.round((at.getTime() - now.getTime()) / 86_400_000);
  if (days === 1) return "tomorrow";
  const name = DAY_SAID[["sun", "mon", "tue", "wed", "thu", "fri", "sat"][at.getUTCDay()] ?? ""];
  return name ? `on ${name}` : "";
}

/**
 * Whether an offer comes round more than once before its dates run out.
 *
 * "Saturdays and Sundays" is a promise about every weekend, and an offer
 * that expires on Sunday night is a promise about this one. Both were
 * said the same way, so a weekend promo read as a standing arrangement
 * and the Friday one read as nothing special.
 *
 * Counted rather than configured: the days it runs on and the date it
 * ends are already written down, and between them they say which kind of
 * offer it is. No end date is a standing offer by definition.
 */
export function comesRoundAgain(
  onDays: string | null | undefined,
  expiresAt: string | null | undefined,
  from: string,
  startsAt: string | null | undefined = null
): boolean {
  const named = String(onDays ?? "")
    .toLowerCase()
    .split(",")
    .map((one) => one.trim())
    .filter((one) => (OFFER_DAYS as readonly string[]).includes(one));
  // No days of its own is either on or over, and neither is a weekday
  // habit anybody can learn.
  if (named.length === 0) return false;
  if (!expiresAt) return true;

  const start = new Date(`${from}T12:00:00Z`);
  if (!Number.isFinite(start.getTime())) return false;

  let seen = 0;
  for (let ahead = 0; ahead <= 60; ahead++) {
    const day = new Date(start.getTime() + ahead * 86_400_000).toISOString().slice(0, 10);
    if (!seasonCovers(startsAt, expiresAt, day)) continue;
    if (!dayMatches(onDays, day)) continue;
    seen++;
    // One full turn of its own days is once. More than that is a habit.
    if (seen > named.length) return true;
  }
  return false;
}

/** "This Saturday and Sunday", for an offer that happens once. */
export function thisTimeSaid(onDays: string | null | undefined): string {
  const named = String(onDays ?? "")
    .toLowerCase()
    .split(",")
    .map((one) => one.trim())
    .filter((one) => (OFFER_DAYS as readonly string[]).includes(one));
  if (named.length === 0 || named.length === 7) return "";

  const words = OFFER_DAYS.filter((day) => named.includes(day)).map((day) => DAY_SAID[day]);
  const list =
    words.length === 1
      ? words[0]
      : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
  return `This ${list} only`;
}
