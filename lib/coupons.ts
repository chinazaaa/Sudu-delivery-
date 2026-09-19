import {
  choiceCombinations,
  choiceLabels,
  choiceSets,
  pickOffer,
  type LiveOffer,
  type OfferContext,
} from "./offers";
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
  /** A choice every line must have made, by name: "Large". */
  required_choice: string;
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
    windows: (coupon.windows ?? "")
      .split(",")
      .map((one) => Number(one.trim()))
      .filter((one) => Number.isFinite(one)),
    firstOrderOnly: coupon.first_order_only,
    minEach: coupon.min_per_person ?? 0,
  }));
}

/** The promotion on an order, read and judged in one go, for the server. */
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
      !(coupon.expires_at && new Date(coupon.expires_at) <= now) &&
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
