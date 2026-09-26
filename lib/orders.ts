import { db } from "./supabase";
import { carLabel } from "./view";
import {
  claimLeader,
  getSharedGroup,
  joinableGroup,
  openGroupFor,
  startSharedGroup,
} from "./groups";
import { feeFor, sameDayFee, splitFee, type Band } from "./fees";
import { activeBands, hoursByDay, safeSettings, sameDayPricing } from "./settings";
import {
  activePromotion,
  checkCoupon,
  couponLabel,
  useCoupon,
  type CouponCheck,
} from "./coupons";
import { offerShare, type LiveOffer } from "./offers";
import { lookupColumn } from "./links";
import { cartConverted } from "./carts";
import { emailAdmins } from "./email";
import { renderEmail, renderText, type Block } from "./email-html";
import { siteUrl } from "./admin-templates";
import { naira, orderRef } from "./money";
import { SLOT_LABEL } from "./config";
import { runDateLabel, weekdayLabel } from "./time";
import { createSameDayBatch, getBatch, isOrderable, orderCounts } from "./batches";
import { bandsFor, isSkincareBatch, skincareIn } from "./skincare";
import { areaOfCart } from "./areas-server";
import { feeAcross } from "./value-bands";
import { realPromoter } from "./promoters";
import { containersIn, pctOf } from "./containers";
import { isExampleNumber, ordersLately, TOO_MANY } from "./guard";
import { areasOfRun, runCovers } from "./areas";
import { runCarries } from "./run-places";
import { stageIndex } from "./stages";
import { deliverySlots, sameInstant, type Slot } from "./same-day";
import { normalisePhone } from "./phone";
import { newPin } from "./customer-auth";
import type {
  Batch,
  CartLine,
  GroupMode,
  MenuItem,
  Order,
  OrderItem,
  OrderGroup,
} from "./types";

export type PlaceOrderInput = {
  batchId: string;
  name: string;
  phone: string;
  hostel: string;
  lines: CartLine[];
  /** Which front door this came through: "app" or "web". Left out by
   *  anything older, which reads as unknown rather than as a guess. */
  source?: "app" | "web";
  /** Somebody abroad is paying by card, in their money. Left out for the
   *  naira that nearly every order is paid in. */
  payCurrency?: "GBP" | "USD";
  /** Present when one person is carting for several (addendum §2). */
  groupMode?: GroupMode | null;
  /** Transfer, or a card link sent by hand over WhatsApp. */
  paymentMethod?: "transfer" | "card";
  /** Whether one person collects every bag, or everyone collects their own. */
  collectMode?: "leader" | "each";
  /** The others in a group order, with their own number and block if given. */
  people?: {
    name: string;
    phone: string;
    hostel: string;
    /** How that person pays their own share, in a split group. */
    pays?: "transfer" | "card";
  }[];
  /** Anything the customer asked for, in their own words. */
  customerNote?: string;
  /** Who they say they heard about the shop from, as a promoter's code.
   *  Empty is a real answer: most people are nobody's referral. */
  heardFrom?: string;
  /** A discount code typed at checkout. */
  coupon?: string;
  /** The order whose join link they opened, so their food rides along with it. */
  joinOrderId?: string;
  /** Start a shared delivery that friends can add to for the next fifteen
   *  minutes. Nobody in one has a delivery fee until it closes. */
  shareDelivery?: boolean;
  /** The group this order is joining, from the link. The group already
   *  exists, and already knows which car it is on. */
  partyId?: string;
  /** Set only by the browser that made the link, so the group learns whose
   *  it is the moment its leader orders. */
  partyLeader?: boolean;
  /** Same day instead of a run: the instant they asked for it to land. A car
   *  goes out for this order alone, priced on the same day ladder. */
  deliverAt?: string;
  /** A share worked out by a shared delivery when it closed. The order cannot
   *  work this out for itself: it depends on who else ended up in the car. */
  fixedFee?: number;
  /** Buying it for somebody else. Whoever pays stays the customer, because
   *  it is their money being chased and their PIN; this is only where the
   *  food goes and who is called when it lands. The block on the order is
   *  the recipient's, since that is where it is going either way. */
  giftTo?: { name: string; phone: string };
  /** The box this came out of, so analytics can say which one anybody
   *  wanted. Nothing about money depends on it. */
  boxId?: string;
  /** Set only by the close of a group, making the orders it exists to make.
   *  By then the group is closed, so the ordinary "can I still join this?"
   *  lookup says no and the order fell back to being a lone one on a run
   *  whose cut off had passed, which then refused it. The close is the shop
   *  finishing what the group started, so it rides that run either way. */
  closingGroup?: boolean;
};

/**
 * Orders that are not really orders any more.
 *
 * Refunded money went back, and cancelled never left: neither is food
 * anybody is buying, so neither belongs in a count, on a run sheet or in a
 * day's takings. Kept in one place so that adding a third kind of gone is
 * one edit rather than a hunt through twenty queries.
 */
export const NOT_ORDERS = ["refunded", "cancelled"] as const;
export const NOT_ORDERS_SQL = `(${NOT_ORDERS.join(",")})`;

/** Refunded or cancelled: not food anybody is buying. */
export const isGone = (status: string): boolean =>
  (NOT_ORDERS as readonly string[]).includes(status);

/**
 * Money that has actually arrived.
 *
 * Not simply "anything that is not pending", which is how a cancelled order
 * came to be counted as paid: the dashboard said ten paid where three people
 * had paid, and a run sheet said seven. Gone is gone before it is anything
 * else.
 */
export const isPaid = (status: string): boolean => !isGone(status) && status !== "pending";

export type PlaceOrderResult =
  | { ok: true; orderId: string; groupId?: string; sharedGroupId?: string }
  | { ok: false; error: string };

type PricedOption = { id: string; name: string; price_delta: number };
export type PricedLine = CartLine & {
  item: MenuItem;
  options: PricedOption[];
  /** Base price plus every chosen option, per unit. */
  unitPrice: number;
};

/**
 * Is that time still on offer?
 *
 * A page left open since the morning will still be showing this morning's
 * times, and the prices beside them. Both are checked here against the real
 * clock, because the one on the customer's phone is whatever it was when the
 * page loaded.
 */
async function checkSameDay(
  wanted: string
): Promise<{ slot: Slot; pricing: Awaited<ReturnType<typeof sameDayPricing>> } | { error: string }> {
  if (((await safeSettings()).same_day_on || "") !== "on") {
    return { error: "Same day delivery is not running today. Pick a run instead." };
  }

  // By the moment rather than by the text: a time kept in the database comes
  // back written differently from the one the code wrote, and comparing the
  // strings refused an order for a slot that was hours away.
  const slot = deliverySlots(new Date(), await hoursByDay()).find((one) =>
    sameInstant(one.at, wanted)
  );
  if (!slot) {
    return {
      // No hour named: the day can be extended in admin and this would then
      // be arguing with the dropdown beside it.
      error: "That time has gone. Pick another time, or put it on a run.",
    };
  }
  return { slot, pricing: await sameDayPricing() };
}

/**
 * The only place an order is priced. The cart posts item ids and quantities;
 * prices, the fee band and the discount are all read from the database here,
 * so a tampered cart cannot buy anything cheaply.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That phone number doesn't look right." };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  // The number printed as an example on every phone field on the site. A
  // script filling a form takes the example as the answer, and a person who
  // really owns it can say so to us rather than being told their order
  // failed for no reason.
  if (isExampleNumber(phone)) {
    return {
      ok: false,
      error: "That is the example number. Put your own in so we can reach you.",
    };
  }

  // A person orders lunch once, or twice if they forgot the drinks. Past
  // that in ten minutes it is a loop, and a run sheet full of orders nobody
  // placed is worse than a refusal somebody can read.
  if ((await ordersLately(phone)) >= TOO_MANY) {
    return {
      ok: false,
      error:
        "That is a lot of orders from one number in a few minutes. " +
        "Give it ten minutes, or message us and we will put it through.",
    };
  }

  const hostel = input.hostel.trim();
  if (hostel.length < 1) return { ok: false, error: "Please enter your hostel or block." };

  /*
   * Buying it for somebody else.
   *
   * The payer stays the customer, because it is their money being chased,
   * their PIN and their order history. This is only who is fed and who is
   * called when the food is at the block, and the block on the order is
   * already the recipient's because that is where it is going.
   *
   * Refused rather than half-accepted if the number is wrong: a gift with a
   * bad number is a bag at a block with nobody to call, which is the one
   * outcome worse than not taking the order.
   */
  const gift = (() => {
    const to = input.giftTo;
    if (!to) return null;
    const toName = to.name.trim();
    const toPhone = normalisePhone(to.phone);
    return toName.length >= 2 && toPhone ? { name: toName, phone: toPhone } : null;
  })();

  if (input.giftTo && !gift) {
    return {
      ok: false,
      error:
        "Check the name and number of whoever it is going to. They are the " +
        "ones we call when it is at their block.",
    };
  }

  // A gift to your own number is not a gift, it is your order with extra
  // typing, and it would have the driver ringing the payer twice.
  if (gift && gift.phone === phone) {
    return {
      ok: false,
      error: "That is your own number. Leave the gift part off if it is for you.",
    };
  }

  // Same day makes its own trip rather than joining one, so the batch is
  // created here instead of chosen. Checked against the real clock, because a
  // page left open since this morning will still be offering this morning's
  // times.
  const sameDay = input.deliverAt ? await checkSameDay(input.deliverAt) : null;
  if (sameDay && "error" in sameDay) return { ok: false, error: sameDay.error };

  // Priced here, before anything commits to a car, because an order that
  // cannot go at all should be refused before a car is made for it.
  const priced = await priceLines(input.lines);
  if ("error" in priced) return { ok: false, error: priced.error };

  // How far the car has to go, which decides both what delivery costs and
  // what this order is allowed to go on. Looked up here rather than trusted
  // from the browser: a cart is written on a phone and a phone can say
  // anything, and this is the sentence the bill comes from.
  const where = await areaOfCart(placesIn(priced.lines));

  // Three hours is the whole promise of a car of its own: fetch it, drive it
  // over. An hour each way to somewhere further out eats that before the
  // kitchen has started, so a far order rides a run or it waits, rather than
  // being a promise broken on the day.
  if (sameDay && !where.sameDay) {
    const far = where.all.find((one) => !one.sameDay);
    return {
      ok: false,
      error:
        `${far?.name ?? "That restaurant"} is too far for a car of its own. ` +
        "It goes on a run, so pick one and everything travels together.",
    };
  }

  // A party that is already going has a car. Whoever ordered first chose it,
  // for a time or for a run, and everybody after rides in that one: letting a
  // joiner pick their own would be two cars, which is not sharing a delivery.
  const party = input.partyId
    ? ((await joinableGroup(input.partyId)) ??
      (input.closingGroup ? await getSharedGroup(input.partyId) : null))
    : null;
  if (input.partyId && !party) {
    // Closed, gone, or never there. The order still goes through, alone and
    // at the full fee, which is right: refusing it would be worse. But it is
    // the exact moment somebody's food quietly leaves their friends behind,
    // so it is never silent again.
    console.error("group not joinable, ordering alone:", input.partyId);
  }

  // Skincare goes in one car a week and food goes this afternoon, so a
  // basket holding both cannot be one order. The shelf and the menu are kept
  // apart everywhere somebody can reach them, and this is the last door:
  // priced on the food ladder, a cleanser would go out on a run at a fee
  // nobody set, on a day nobody said.
  const mixed = await skincareIn(input.lines.map((line) => line.menu_item_id));
  if (mixed && input.deliverAt === undefined && !input.partyId) {
    const car = await getBatch(input.batchId);
    if (!car || (car.kind ?? "run") !== "skincare") {
      return {
        ok: false,
        error:
          "Skincare comes on its own car, once a week, so it cannot go on a " +
          "food run. Order it from the skincare shelf and your food here.",
      };
    }
  }

  const batch = party
    ? await getBatch(party.batch_id)
    : sameDay
      ? await createSameDayBatch({
          deliverAt: sameDay.slot.at,
          label: sameDay.slot.day === "today" ? `Today, ${sameDay.slot.label}` : sameDay.slot.label,
        })
      : await getBatch(input.batchId);

  if (!batch) return { ok: false, error: "That batch no longer exists." };

  // A run is a car with a route. It always passes Sangotedo and it goes
  // anywhere else only because somebody said so when it was made, so a
  // Thursday run that was never going to Lekki cannot pick up a Lekki order
  // because somebody put one in the basket.
  if (!sameDay && !isSkincareBatch(batch) && !runCovers(batch.areas ?? "", where.all)) {
    const missed = where.all.find(
      (one) => !areasOfRun(batch.areas ?? "").includes(one.id)
    );
    return {
      ok: false,
      error:
        `That run is not going to ${missed?.name ?? "that area"}. ` +
        "Pick one that does, or take those things out.",
    };
  }
  // Some runs are one counter's run: a car queuing at Domino's all evening
  // is not also fetching from Chicken Republic. Runs only, because a car of
  // its own goes wherever the person who paid for it asked.
  if (
    !sameDay &&
    !isSkincareBatch(batch) &&
    !runCarries(batch.only_places ?? "", placesIn(priced.lines))
  ) {
    return {
      ok: false,
      error:
        "That run is not stopping at every restaurant in this cart. " +
        "Pick one that is, or take those things out.",
    };
  }
  if (!sameDay && !party && !isOrderable(batch)) {
    return { ok: false, error: "That batch has closed. Pick the next one." };
  }
  // The close can run past a cut off, and has to: a group's clock is allowed
  // to end on the cut off itself, and the run is marked closed the moment it
  // passes. Closed is not gone. What matters is whether the food can still be
  // bought, so this rides until the bags are in the car.
  if (
    input.closingGroup &&
    (batch.status === "delivered" ||
      batch.status === "cancelled" ||
      stageIndex(batch.stage) >= stageIndex("on_the_road"))
  ) {
    return {
      ok: false,
      error:
        "That run has already left, so this food could not be ordered onto it. " +
        "Put it on the next one.",
    };
  }

  const capacityError = await checkCapacity(batch);
  if (capacityError) return { ok: false, error: capacityError };

  // Delivery is priced from whatever bands the admin has set, read here so a
  // price change takes effect on the next order and not on a redeploy. Which
  // ladder is a fact about two things: how far the car has to go, and whether
  // it is the weekly skincare drop, which has one of its own.
  const bands = isSkincareBatch(batch) ? await bandsFor(batch) : where.bands;
  const customerNote = (input.customerNote ?? "").trim();
  const returning = await isReturningCustomer(phone);

  // A promotion prices the delivery itself rather than taking money off it,
  // so it is settled before anything else: "Domino's delivery is 2,000" is a
  // price, not a discount, and five items or one it is the same price.
  const promotion = await activePromotion({
    restaurantIds: placesIn(priced.lines),
    itemIds: priced.lines.map((line) => line.menu_item_id),
    lineChoices: priced.lines.map((line) => line.options.map((one) => one.name)),
    items: countItems(priced.lines),
    batchId: batch.id,
    deliverAt: batch.kind === "same_day" ? batch.deliver_at : null,
    returning,
  });

  // One offer to a checkout. An automatic one has already claimed the slot,
  // so a typed code is refused rather than stacked, and told why: "that code
  // is not in use" would read as the code being broken.
  if (promotion && input.coupon?.trim()) {
    return {
      ok: false,
      error:
        `${promotion.coupon.note.trim() || "An offer"} is already on this order, ` +
        "and only one offer applies at a time.",
    };
  }

  // A discount code is checked against this order's own delivery, so "free
  // delivery" is worth what delivery actually costs here and no more. The
  // check happens against the fee the order is about to be charged.
  const coupon = input.coupon?.trim()
    ? await checkCoupon({
        code: input.coupon,
        fee: feeFor(countItems(priced.lines), batch.flash_fee, bands),
        food: countFood(priced.lines),
        returning,
        batchId: batch.id,
        restaurantIds: placesIn(priced.lines),
      })
    : null;
  if (coupon && !coupon.ok) return { ok: false, error: coupon.error };

  const paymentMethod = input.paymentMethod ?? "transfer";
  const collectMode = input.collectMode ?? "leader";

  // A join is honoured only when that order is really on this run and the run
  // is still taking orders. A stale link from last Friday simply prices as an
  // ordinary order rather than failing the checkout.
  const joined = input.joinOrderId ? await rootOrder(input.joinOrderId) : null;
  const joinRootId =
    joined && joined.batch_id === batch.id && !isGone(joined.status)
      ? joined.id
      : null;

  // A shared delivery, either joined or started here. Everybody in one waits
  // for it to close before they have a delivery fee at all, because the fee
  // depends on who else turns up and what they order between them.
  // A group can pick a time like anybody else. The fee waits for the close
  // either way, and is split evenly off whichever ladder its car belongs to.
  const sharedGroupId = party
    ? party.id
    : input.partyId
      ? null // The link has closed or gone. This is an ordinary order.
      : sameDay
      ? null
      : joinRootId
        ? (await openGroupFor(joinRootId))?.id ?? null
        : input.shareDelivery && input.groupMode !== "split"
          ? await startSharedGroup({ batch, phone, name, hostel })
          : null;

  const result =
    input.groupMode === "split"
      ? await placeSplitGroup({
          batch,
          phone,
          name,
          hostel,
          lines: priced.lines,
          coupon: coupon?.ok ? coupon : null,
          paymentMethod,
          collectMode,
          people: input.people ?? [],
          bands,
          customerNote,
          promotion: promotion ? { code: promotion.coupon.code, offer: promotion.offer } : null,
        })
      : await placeSingleOrder({
          batch,
          phone,
          name,
          hostel,
          lines: priced.lines,
          coupon: coupon?.ok ? coupon : null,
          source: input.source,
          payCurrency: input.payCurrency,
          joinRootId: sameDay ? null : joinRootId,
          sharedGroupId,
          gift,
          boxId: input.boxId,
          // A promotion is the price, so it wins over the ladder and over the
          // same day pricing alike. A share worked out by a group that has
          // closed still wins over it: by then the money is decided.
          // A promotion prices delivery outright and wins. Under it, a
          // kitchen that charges by what the shopping comes to rather than
          // by how many things it is: a market trip is one trip and two
          // bags, and the container ladder would call it eleven containers.
          fixedFee:
            input.fixedFee ??
            (promotion && !sharedGroupId
              ? promotion.fee
              : where.valueBands.length > 0 && !sameDay && !party
                ? // A cart that is nothing but market shopping is charged
                  // by what the shopping comes to, full stop. Mix a
                  // restaurant into it and the dearer of the two measures
                  // comes back: a pepper added to twelve pizzas must not
                  // drop the whole order onto the market's ladder.
                  feeAcross(
                    countFood(priced.lines),
                    feeFor(countItems(priced.lines), batch.flash_fee, where.bands),
                    where.valueBands,
                    where.allByValue
                  ) + where.dearest.runExtra
                : undefined),
          promotionCode: promotion?.coupon.code ?? null,
          sameDayFee: sameDay && !party
            ? sameDayFee(
                countItems(priced.lines),
                sameDay.slot.urgent,
                // The ladder as this cart is charged it, distance and all.
                // A car of its own only goes to areas that allow one, so
                // this is the home ladder unless an area says otherwise.
                where.sameDayBands,
                where.urgentExtra
              )
            : null,
          groupMode: input.groupMode ?? null,
          paymentMethod,
          collectMode,
          people: input.people ?? [],
          bands,
          customerNote,
        });

  if (!result.ok) return result;

  if (coupon?.ok) await useCoupon(coupon.coupon.code);
  // A promotion counts its uses too, because the cap on how many orders it is
  // good for is the cap on how much you can carry. In a split group it is one
  // use per person, since each of them paid the offer price.
  if (promotion && !sharedGroupId) {
    const heads =
      input.groupMode === "split" ? Math.max(1, (input.people ?? []).length + 1) : 1;
    for (let taken = 0; taken < heads; taken += 1) {
      await useCoupon(promotion.coupon.code);
    }
  }
  // The person who made the link is the one who can close it. Until they
  // order, the group only knows their first name; now it knows their number,
  // so every other page can tell who the leader is without being told.
  if (party && input.partyLeader) await claimLeader(party.id, phone);
  await bindCustomer({
    phone,
    name,
    hostel,
    returning,
    paymentMethod,
    heardFrom: input.heardFrom ?? "",
  });
  // The cart behind this order is no longer abandoned, and the admins are told
  // rather than having to keep refreshing. Neither can fail the order.
  await cartConverted(phone, batch.id).catch(() => {});
  // Not in a shared delivery. An order in one is half an order: it has no
  // delivery fee yet, nobody can pay it, and there may be three more coming
  // in the next ten minutes. Telling the admins now means a mail each, every
  // one of them showing a total that is about to change, for a car nobody can
  // start buying for yet. The group sends one mail when it closes, which is
  // the moment there is something to act on.
  if (!party) {
    void announceOrder({
      orderId: result.orderId,
      name,
      phone,
      hostel,
      batch,
      items: countItems(priced.lines),
      note: customerNote,
    });
  }
  return result;
}

/**
 * Looks every line up in the database, including the chosen size and flavour.
 * Nothing about price comes from the browser: a large pepperoni costs what the
 * menu says a large pepperoni costs.
 */
export async function priceLines(
  lines: CartLine[]
): Promise<{ lines: PricedLine[] } | { error: string }> {
  const wanted = lines.filter((l) => l.qty > 0);
  if (wanted.length === 0) return { error: "Your cart is empty." };

  const { data, error } = await db()
    .from("menu_items")
    .select("*")
    .in("id", wanted.map((l) => l.menu_item_id));
  if (error) return { error: error.message };

  const items = new Map((data ?? []).map((i) => [i.id, i as MenuItem]));

  const optionIds = [...new Set(wanted.flatMap((l) => l.option_ids ?? []))];
  const options = new Map<string, PricedOption & { available: boolean }>();

  if (optionIds.length > 0) {
    const { data: rows, error: optionError } = await db()
      .from("item_options")
      .select("id, name, price_delta, available")
      .in("id", optionIds);
    if (optionError) return { error: optionError.message };
    for (const row of rows ?? []) options.set(row.id as string, row as any);
  }

  const priced: PricedLine[] = [];

  for (const line of wanted) {
    const item = items.get(line.menu_item_id);
    if (!item) return { error: "An item in your cart is no longer on the menu." };
    if (!item.available) return { error: `${item.name} is unavailable today.` };

    const chosen: PricedOption[] = [];
    for (const id of line.option_ids ?? []) {
      const option = options.get(id);
      if (!option) return { error: `A choice on ${item.name} is no longer offered.` };
      if (!option.available) {
        return { error: `${option.name} is unavailable on ${item.name} today.` };
      }
      chosen.push({ id: option.id, name: option.name, price_delta: option.price_delta });
    }

    priced.push({
      ...line,
      item,
      options: chosen,
      unitPrice:
        item.price_food + chosen.reduce((sum, o) => sum + o.price_delta, 0),
    });
  }
  return { lines: priced };
}

/** Every kitchen a cart draws on, for a code that belongs to one of them. */
const placesIn = (lines: PricedLine[]) => [
  ...new Set(lines.map((l) => l.item.restaurant_id)),
];

// Room in the car, not lines on a receipt. A drink is a quarter of a
// container and a restaurant's own multi-box deal is worth what it really
// is. Read off the item, so the customer's cart cannot claim otherwise.
const countItems = (lines: PricedLine[]) =>
  containersIn(lines.map((l) => ({ qty: l.qty, container_pct: l.item.container_pct })));
const countFood = (lines: PricedLine[]) =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

async function placeSingleOrder(args: {
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
  lines: PricedLine[];
  coupon: Extract<CouponCheck, { ok: true }> | null;
  groupMode: GroupMode | null;
  paymentMethod: "transfer" | "card";
  collectMode: "leader" | "each";
  people: { name: string; phone: string; hostel: string }[];
  bands: Band[];
  customerNote: string;
  /** Which front door it came through. */
  source?: "app" | "web";
  /** The money a card link will be made out in. */
  payCurrency?: "GBP" | "USD";
  /** The delivery being joined, already resolved back to the order that
   *  started it. */
  joinRootId: string | null;
  /** The shared delivery this order belongs to, when there is one. */
  sharedGroupId: string | null;
  /** Already worked out for a same day trip, which is priced on its own
   *  ladder rather than by the banding the runs use. */
  sameDayFee: number | null;
  /** The promotion that priced this delivery, for counting its use. */
  promotionCode?: string | null;
  /** A share handed down by a shared delivery that has just closed. */
  fixedFee?: number;
  /** Who is being fed, when that is not the person paying. */
  gift?: { name: string; phone: string } | null;
  /** The box it came out of, for analytics. */
  boxId?: string;
}): Promise<PlaceOrderResult> {
  // Adding to an existing order is a second order to the same batch, not an
  // edit: the admin view merges by phone into one bag (addendum §3). Only the
  // difference in fee is charged, because it is one load either way.
  // Joining a friend's delivery is priced off that whole delivery rather than
  // off this phone's own orders: it is one load in the car either way. Nobody
  // already in it is altered, so a reference somebody has already been told to
  // type in their transfer cannot change underneath them.
  const existing = await existingLoad(args.batch.id, args.phone);
  const combined = existing.items + countItems(args.lines);

  // In a shared delivery nobody has a fee until the group closes: it is split
  // evenly then, once it is known how many are in the car. Writing a figure
  // now would be quoting a number that is about to change.
  const fee =
    // A share the group worked out when it closed. It is the only figure that
    // can be right: what delivery costs each of them depends on who else
    // ended up in the car, which this order cannot know about itself.
    args.fixedFee !== undefined
      ? args.fixedFee
      : args.sameDayFee !== null
      ? args.sameDayFee
      : args.sharedGroupId
        ? 0
        : Math.max(
            0,
            feeFor(combined, args.batch.flash_fee, args.bands) - existing.feeCharged
          );

  // Two different meanings of "group", and only one of them can apply.
  //
  // A shared delivery is friends each buying their own food out of one car.
  // Ordering for friends is one person carting and paying for several. Both
  // write to order_groups, and this used to make the second one even when the
  // order was already in the first: a fresh group with no closes_at, which
  // the order then joined instead, leaving the link's group empty for ever.
  // Nobody could see why, because both halves had worked.
  //
  // In a shared delivery the group already exists. It is the one from the
  // link, and nothing here makes another.
  let group: OrderGroup | null = null;
  if (args.groupMode === "one_payer" && !args.sharedGroupId) {
    group = await createGroup(args, "one_payer", args.collectMode);
    if (!group) return { ok: false, error: "Could not start that group order." };
    await saveMembers(group.id, args.people);
  }

  // An untagged line belongs to whoever is ordering, so it is labelled with
  // their name rather than left blank. This applies whenever any line carries
  // a name at all, not only inside a group: tagging two items in the cart and
  // leaving a third alone used to produce a bag where one item had no owner.
  const tagged = group !== null || args.lines.some((line) => line.for_name?.trim());
  const lines = tagged
    ? args.lines.map((line) => ({
        ...line,
        for_name: line.for_name?.trim() || args.name,
      }))
    : args.lines;

  const order = await insertOrder({
    batch_id: args.batch.id,
    customer_phone: args.phone,
    customer_name: args.name,
    hostel: args.hostel,
    gift: args.gift ?? null,
    box_id: args.boxId ?? null,
    subtotal_food: countFood(lines),
    fee,
    discount: args.coupon?.discount ?? 0,
    coupon_code: args.coupon?.coupon.code ?? args.promotionCode ?? null,
    // The shared delivery first. It is the one somebody was sent a link to and
    // is waiting to see this order appear in.
    group_id: args.sharedGroupId ?? group?.id ?? null,
    for_name: args.sharedGroupId ? args.name : null,
    payment_method: args.paymentMethod,
    customer_note: args.customerNote,
    source: args.source,
    pay_currency: args.payCurrency,
    shared_with: args.joinRootId,
    lines,
  });

  return order
    ? { ok: true, orderId: order, groupId: group?.id, sharedGroupId: args.sharedGroupId ?? undefined }
    : { ok: false, error: "Could not save that order." };
}

/**
 * Split links: one order per named person, all in one group. Keeping them as
 * separate orders is what lets an unpaid share simply not travel, keeping every
 * order wholly paid or wholly unpaid, with no half-paid line items.
 */
async function placeSplitGroup(args: {
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
  lines: PricedLine[];
  coupon: Extract<CouponCheck, { ok: true }> | null;
  paymentMethod: "transfer" | "card";
  collectMode: "leader" | "each";
  people: {
    name: string;
    phone: string;
    hostel: string;
    pays?: "transfer" | "card";
  }[];
  bands: Band[];
  customerNote: string;
  /** A promotion pricing the delivery, split between them with a floor. */
  promotion: { code: string; offer: LiveOffer } | null;
}): Promise<PlaceOrderResult> {
  // The leader's own items are keyed by an empty name, not by what they typed
  // in "Your name". Keying by the name collapsed the whole group into one payer
  // whenever a friend happened to share the leader's name.
  const byPerson = new Map<string, PricedLine[]>();
  for (const line of args.lines) {
    const who = (line.for_name ?? "").trim();
    byPerson.set(who, [...(byPerson.get(who) ?? []), line]);
  }
  // What a split needs is somebody other than the leader to pay, not two of
  // them. Ordering for one friend who pays for it herself is a real thing
  // people do, and refusing it made the leader front the money and chase it.
  // A "split" where the leader is the only one with food is still nothing to
  // split, and is still refused.
  if (![...byPerson.keys()].some((who) => who !== "")) {
    return {
      ok: false,
      error:
        "Splitting payment needs somebody other than you to have food in the cart. " +
        "Go back to the cart and tap a name under each item.",
    };
  }

  const group = await createGroup(args, "split", args.collectMode);
  if (!group) return { ok: false, error: "Could not start that group order." };
  await saveMembers(group.id, args.people);
  // Each of them is about to own an order, so each of them needs a PIN.
  await ensureCustomers(args.people);

  // The band is set by the whole load, then shared out by what each person got.
  const people = [...byPerson.entries()];
  // A promotion is a price per person, not a load to share out: it is what
  // the offer says on the front of the shop, and it does not fall because
  // somebody brought a friend.
  const promoShare = args.promotion
    ? offerShare(args.promotion.offer, countItems(args.lines), people.length)
    : 0;
  const groupFee = args.promotion
    ? promoShare * people.length
    : feeFor(countItems(args.lines), args.batch.flash_fee, args.bands);
  const shares = args.promotion
    ? people.map(() => promoShare)
    : splitFee(groupFee, people.map(([, lines]) => countItems(lines)));

  let leaderOrderId: string | null = null;

  for (const [index, [who, lines]] of people.entries()) {
    const isLeader = who === "";
    // Their own number, when they gave one: it is what their payment link and
    // their transfer narration hang off, and it gives them their own history.
    const theirs = args.people.find((p) => p.name === who);
    const phone = (theirs?.phone && normalisePhone(theirs.phone)) || args.phone;

    const id = await insertOrder({
      batch_id: args.batch.id,
      customer_phone: phone,
      customer_name: args.name,
      hostel: theirs?.hostel?.trim() || args.hostel,
      subtotal_food: countFood(lines),
      fee: shares[index],
      // A discount lands once, on the share the person who typed the code is
      // paying for.
      discount: isLeader ? args.coupon?.discount ?? 0 : 0,
      coupon_code: isLeader
        ? args.coupon?.coupon.code ?? args.promotion?.code ?? null
        : args.promotion?.code ?? null,
      group_id: group.id,
      // The leader's share carries their own name on the bag label.
      for_name: isLeader ? args.name : who,
      // Everyone pays their own share their own way: one friend can send a
      // transfer while another waits for a card link.
      payment_method: isLeader ? args.paymentMethod : theirs?.pays ?? args.paymentMethod,
      // The note belongs to whoever wrote it, not to everyone in the group.
      customer_note: isLeader ? args.customerNote : "",
      lines,
    });
    if (!id) return { ok: false, error: "Could not save that group order." };
    if (isLeader || leaderOrderId === null) leaderOrderId = id;
  }

  return { ok: true, orderId: leaderOrderId!, groupId: group.id };
}

async function createGroup(
  args: { batch: Batch; phone: string; name: string; hostel: string },
  mode: GroupMode,
  collectMode: "leader" | "each"
): Promise<OrderGroup | null> {
  const { data } = await db()
    .from("order_groups")
    .insert({
      batch_id: args.batch.id,
      leader_phone: args.phone,
      leader_name: args.name,
      hostel: args.hostel,
      mode,
      collect_mode: collectMode,
    })
    .select("*")
    .single();
  return (data as OrderGroup) ?? null;
}

/**
 * Keeps the name, number and block of everyone in a group. The bag labels come
 * from the order lines; this is how anyone can be phoned when the food lands.
 */
/**
 * A PIN for everybody who ends up holding an order of their own.
 *
 * In a split group each friend gets their own order under their own number,
 * and without a customer row they have no PIN, so they cannot open the order
 * they are being asked to pay for. Their name and block are written only when
 * there is nothing there already: somebody who has ordered before keeps their
 * own details, and their promoter stays theirs for life.
 */
async function ensureCustomers(
  people: { name: string; phone: string; hostel: string }[]
): Promise<void> {
  const rows = people
    .map((person) => ({
      phone: normalisePhone(person.phone),
      name: person.name.trim(),
      hostel: person.hostel.trim(),
    }))
    .filter((person): person is { phone: string; name: string; hostel: string } =>
      Boolean(person.phone)
    );
  if (rows.length === 0) return;

  const seen = new Map<string, { phone: string; name: string; hostel: string }>();
  for (const row of rows) if (!seen.has(row.phone)) seen.set(row.phone, row);

  try {
    const { data: known } = await db()
      .from("customers")
      .select("phone")
      .in("phone", [...seen.keys()]);
    for (const row of (known ?? []) as { phone: string }[]) seen.delete(row.phone);
    if (seen.size === 0) return;

    await db()
      .from("customers")
      .insert(
        [...seen.values()].map((person) => ({
          phone: person.phone,
          name: person.name || "Friend",
          hostel: person.hostel,
          pin: newPin(),
        }))
      );
  } catch {
    // Their order exists either way. A missing PIN is a smaller problem than
    // an order that would not save.
  }
}

async function saveMembers(
  groupId: string,
  people: { name: string; phone: string; hostel: string }[]
): Promise<void> {
  const rows = people
    .filter((person) => person.name.trim().length > 0)
    .map((person) => ({
      group_id: groupId,
      name: person.name.trim(),
      phone: normalisePhone(person.phone) ?? person.phone.trim(),
      hostel: person.hostel.trim(),
    }));
  if (rows.length === 0) return;
  await db().from("group_members").insert(rows);
}

export async function membersOf(groupId: string | null): Promise<GroupMember[]> {
  if (!groupId) return [];
  const { data } = await db()
    .from("group_members")
    .select("id, name, phone, hostel")
    .eq("group_id", groupId)
    .order("name");
  return (data ?? []) as GroupMember[];
}

async function insertOrder(args: {
  batch_id: string;
  customer_phone: string;
  customer_name: string;
  hostel: string;
  /** Who is actually being fed, when that is not the person paying. */
  gift?: { name: string; phone: string } | null;
  /** The box it came out of, for the analytics page and nothing else. */
  box_id?: string | null;
  subtotal_food: number;
  fee: number;
  discount: number;
  coupon_code: string | null;
  group_id: string | null;
  for_name: string | null;
  payment_method: "transfer" | "card";
  customer_note: string;
  /** Which front door it came through. */
  source?: "app" | "web";
  /** The money a card link will be made out in. */
  pay_currency?: "GBP" | "USD";
  /** The order whose delivery this one is joining, if any. */
  shared_with?: string | null;
  lines: PricedLine[];
}): Promise<string | null> {
  const total = Math.max(0, args.subtotal_food + args.fee - args.discount);

  const { data: order, error } = await db()
    .from("orders")
    .insert({
      batch_id: args.batch_id,
      customer_phone: args.customer_phone,
      customer_name: args.customer_name,
      hostel: args.hostel,
      subtotal_food: args.subtotal_food,
      fee: args.fee,
      discount: args.discount,
      total,
      coupon_code: args.coupon_code,
      group_id: args.group_id,
      for_name: args.for_name,
      payment_method: args.payment_method,
      customer_note: args.customer_note,
      shared_with: args.shared_with ?? null,
      status: "pending",
      ...(args.gift
        ? { deliver_to_name: args.gift.name, deliver_to_phone: args.gift.phone }
        : {}),
      ...(args.box_id ? { box_id: args.box_id } : {}),
      ...(args.source ? { source: args.source } : {}),
      ...(args.pay_currency ? { pay_currency: args.pay_currency } : {}),
    })
    .select("id")
    .single();

  // Naming a column the database has not got refuses the whole statement, so
  // a shop that has not run the migration yet takes the order anyway and
  // simply does not know it was a gift. Losing an order over it would be far
  // worse than losing the label.
  if (error && (args.gift || args.box_id || args.source || args.pay_currency)) {
    return insertOrder({
      ...args,
      gift: null,
      box_id: null,
      source: undefined,
      pay_currency: undefined,
    });
  }
  if (error || !order) return null;

  const { data: savedLines, error: linesError } = await db()
    .from("order_items")
    .insert(
      args.lines.map((l) => ({
        order_id: order.id,
        menu_item_id: l.menu_item_id,
        qty: l.qty,
        unit_price_at_order: l.unitPrice,
        for_name: l.for_name ?? args.for_name ?? null,
      }))
    )
    .select("id");
  if (linesError || !savedLines) {
    await db().from("orders").delete().eq("id", order.id);
    return null;
  }

  // The chosen size and flavour are copied at order time like the price, so
  // editing the menu later never rewrites what was actually bought.
  const chosen = savedLines.flatMap((row, index) =>
    args.lines[index].options.map((option) => ({
      order_item_id: row.id,
      option_id: option.id,
      name_at_order: option.name,
      price_delta_at_order: option.price_delta,
    }))
  );
  if (chosen.length > 0) {
    const { error: optionError } = await db().from("order_item_options").insert(chosen);
    if (optionError) {
      await db().from("orders").delete().eq("id", order.id);
      return null;
    }
  }
  return order.id as string;
}

/** What this phone already has in this batch: containers, and fee charged. */
export async function existingLoad(
  batchId: string,
  phone: string
): Promise<{ items: number; feeCharged: number; orders: Order[] }> {
  const { data } = await db()
    .from("orders")
    .select("*")
    .eq("batch_id", batchId)
    .eq("customer_phone", phone)
    .not("status", "in", NOT_ORDERS_SQL);

  const orders = (data ?? []) as Order[];
  if (orders.length === 0) return { items: 0, feeCharged: 0, orders };

  const { data: items } = await db()
    .from("order_items")
    .select("order_id, qty")
    .in("order_id", orders.map((o) => o.id));

  return {
    items: (items ?? []).reduce((sum, row) => sum + (row.qty as number), 0),
    feeCharged: orders.reduce((sum, o) => sum + o.fee, 0),
    orders,
  };
}

/**
 * The order a shared delivery hangs off.
 *
 * Somebody joining a friend who had themselves joined somebody else belongs to
 * the same delivery as both of them, so a join always resolves back to the one
 * order that started it.
 */
export async function rootOrder(orderId: string): Promise<FullOrder | null> {
  const first = await getOrder(orderId);
  if (!first) return null;
  if (!first.shared_with) return first;
  const root = await getOrder(first.shared_with);
  return root ?? first;
}

/**
 * Everything travelling in one shared delivery: the order that started it and
 * everyone who joined, with what they have been charged for carrying it.
 *
 * The same shape as `existingLoad`, and used the same way: a new arrival pays
 * the difference between what the whole load costs to carry and what has
 * already been paid towards it. Nobody who already ordered is touched, which
 * is what makes this safe to do to an order somebody has already been given a
 * narration for.
 */
export async function deliveryLoad(
  batchId: string,
  rootId: string
): Promise<{ items: number; feeCharged: number; orders: Order[] }> {
  const { data } = await db()
    .from("orders")
    .select("*")
    .eq("batch_id", batchId)
    .or(`id.eq.${rootId},shared_with.eq.${rootId}`)
    .not("status", "in", NOT_ORDERS_SQL);

  const orders = (data ?? []) as Order[];
  if (orders.length === 0) return { items: 0, feeCharged: 0, orders };

  const { data: items } = await db()
    .from("order_items")
    .select("order_id, qty")
    .in("order_id", orders.map((o) => o.id));

  return {
    items: (items ?? []).reduce((sum, row) => sum + (row.qty as number), 0),
    feeCharged: orders.reduce((sum, o) => sum + o.fee, 0),
    orders,
  };
}

/**
 * Tells whoever runs the shop that an order has landed. Deliberately not
 * awaited by the caller: an email provider having a bad minute must not slow
 * down or fail a checkout.
 */
async function announceOrder(args: {
  orderId: string;
  name: string;
  phone: string;
  hostel: string;
  batch: Batch;
  items: number;
  note: string;
}): Promise<void> {
  try {
    const order = await getOrder(args.orderId);
    const label = carLabel(args.batch);

    // Straight to the order, because the point of the email is to go and do
    // something about it: send the message, paste the card link, mark it paid.
    const url = await siteUrl().catch(() => "");
    const link = url ? `${url}/admin/orders/${args.orderId}` : "";

    // Card is the one that needs something doing by hand: the link goes out
    // on WhatsApp. It belongs in the subject, where it is read first.
    const byCard = order?.payment_method === "card";

    const title =
      `New order ${order ? orderRef(order) : ""} · ${args.name} · ` +
      `${naira(order?.total ?? 0)}${byCard ? " · card link" : ""}`;

    // Grouped by restaurant, because the next thing that happens is somebody
    // ordering it from each one, counter by counter.
    const byPlace = new Map<string, string[]>();
    for (const line of order?.lines ?? []) {
      const place = line.restaurant || "Unknown";
      const choices = line.choices.length > 0 ? ` (${line.choices.join(", ")})` : "";
      byPlace.set(place, [...(byPlace.get(place) ?? []), `${line.qty} × ${line.name}${choices}`]);
    }

    const blocks: Block[] = [
      {
        kind: "text",
        // The label already says what kind of car it is, so the word "run"
        // on the end of it invented one that was never on the schedule.
        text: `${args.name} just ordered · ${label}.`,
      },
      ...(link ? [{ kind: "button" as const, label: "Open the order", href: link }] : []),
      {
        kind: "rows",
        rows: [
          { label: "Total", value: `${naira(order?.total ?? 0)} · unpaid` },
          // The total is what lands in the bank, so a discount has to be said
          // out loud or the number looks short.
          ...(order && order.discount > 0
            ? [
                {
                  label: "Discount",
                  value:
                    `−${naira(order.discount)}` +
                    (order.coupon_code ? ` · ${order.coupon_code}` : ""),
                },
              ]
            : []),
          {
            label: "Paying by",
            value: byCard ? "Card, link not sent yet" : "Bank transfer",
          },
          { label: "Number", value: args.phone },
          { label: "Block", value: args.hostel },
          { label: "Items", value: String(args.items) },
        ],
      },
      ...[...byPlace.entries()].map(([place, items]) => ({
        kind: "list" as const,
        title: place,
        items,
      })),
      ...(byCard
        ? [
            {
              kind: "note" as const,
              text:
                "They chose to pay by card, so send them the payment link on " +
                "WhatsApp. The order stays unpaid until you mark it paid.",
            },
          ]
        : []),
      ...(args.note ? [{ kind: "note" as const, text: `They asked: ${args.note}` }] : []),
    ];

    const tagline = (await safeSettings()).tagline || undefined;
    await emailAdmins(title, renderText(title, blocks), renderEmail(title, blocks, tagline), "order");
  } catch {
    /* Never let a notification break an order that is already saved. */
  }
}

/**
 * Checks a code against a cart before the order is placed, so somebody can
 * see what it is worth rather than typing it and hoping. It prices the cart
 * the same way placing it does, because a code's worth depends on the
 * delivery being charged.
 */
export async function previewCoupon(args: {
  code: string;
  batchId: string;
  lines: CartLine[];
  phone: string;
}): Promise<{ ok: true; discount: number; label: string } | { ok: false; error: string }> {
  const batch = await getBatch(args.batchId);
  if (!batch) return { ok: false, error: "Pick a run first." };

  const priced = await priceLines(args.lines);
  if ("error" in priced) return { ok: false, error: priced.error };

  const phone = normalisePhone(args.phone);

  // One offer to a checkout, and an automatic one has already taken it.
  const holding = await activePromotion({
    restaurantIds: placesIn(priced.lines),
    itemIds: priced.lines.map((line) => line.menu_item_id),
    lineChoices: priced.lines.map((line) => line.options.map((one) => one.name)),
    items: countItems(priced.lines),
    batchId: batch.id,
    deliverAt: batch.kind === "same_day" ? batch.deliver_at : null,
    returning: phone ? await isReturningCustomer(phone) : false,
  });
  if (holding) {
    return {
      ok: false,
      error:
        `${holding.coupon.note.trim() || "An offer"} is already on this order, ` +
        "and only one offer applies at a time.",
    };
  }

  const result = await checkCoupon({
    code: args.code,
    fee: feeFor(countItems(priced.lines), batch.flash_fee, await bandsFor(batch)),
    food: countFood(priced.lines),
    returning: phone ? await isReturningCustomer(phone) : false,
    batchId: batch.id,
    restaurantIds: placesIn(priced.lines),
  });

  return result.ok
    ? { ok: true, discount: result.discount, label: couponLabel(result.coupon) }
    : { ok: false, error: result.error };
}

export type MoveResult = { ok: true; orderId: string } | { ok: false; error: string };

/**
 * Moves an order onto another run, keeping its number and its items.
 *
 * An unpaid order is repriced against today's menu and the new run's fee band,
 * because a week-old price is not a promise anybody made. A paid one is not:
 * the money is settled, so changing one's mind from Friday afternoon to Friday
 * night must not produce a bill or a refund. That only holds while the run it
 * is on is still open; once it has closed, that run has been shopped for.
 *
 * A split group moves together, since half a group on another night is
 * nobody's idea of a group order.
 */
export async function moveOrder(
  orderId: string,
  batchId: string,
  /** Admin moving it by hand. A customer may not move a paid order off a run
   *  that has gone shopping, because the food is already bought; admin is the
   *  person who bought it and is deciding to carry it on another car. Without
   *  this the one section built for exactly that case refused every time. */
  asAdmin = false
): Promise<MoveResult> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "That order no longer exists." };
  if (isGone(order.status)) {
    return {
      ok: false,
      error:
        order.status === "cancelled"
          ? "That order was cancelled, so there is nothing to move."
          : "That order was refunded, so there is nothing to move.",
    };
  }

  const paid = isPaid(order.status);
  if (!asAdmin && paid && !isOrderable(order.batch)) {
    return {
      ok: false,
      error:
        "That run has closed and the food has been bought, so this one cannot move. " +
        "Message us and we will sort it out.",
    };
  }

  const batch = await getBatch(batchId);
  if (!batch) return { ok: false, error: "That run no longer exists." };
  // A closed run is closed to customers. Admin putting somebody on one is
  // the whole point of moving an order by hand: the car it was on has gone.
  if (!asAdmin && !isOrderable(batch)) {
    return { ok: false, error: "That run is not taking orders. Pick another." };
  }

  const capacity = await checkCapacity(batch);
  if (capacity) return { ok: false, error: capacity };

  // The whole group travels together, or none of it does.
  const moving =
    order.group_id && order.shares.length > 1
      ? order.shares
          .filter((share) => !isGone(share.status))
          .map((share) => share.id)
      : [orderId];

  const bands = await bandsFor(batch);

  for (const id of moving) {
    const one = await getOrder(id);
    if (!one) continue;

    // A paid order carries its money across untouched: nothing is re-charged
    // and nothing is refunded for changing which night it comes on.
    if (isPaid(one.status)) {
      await db().from("orders").update({ batch_id: batch.id }).eq("id", id);
      continue;
    }

    // Today's prices, today's availability, choices included.
    const repriced = await repeatLines(one);
    if (repriced.blocked.length > 0) {
      const names = repriced.blocked.map((item) => `${item.name} is ${item.reason}`);
      return { ok: false, error: `${names.join(", ")}. Take it off the order first.` };
    }

    const food = repriced.lines.reduce(
      (total, line) => total + line.unitPrice * line.qty,
      0
    );
    const items = repriced.lines.reduce((count, line) => count + line.qty, 0);

    // Whatever that person already has on the new run decides the top-up.
    const existing = await existingLoad(batch.id, one.customer_phone);
    const fee = Math.max(
      0,
      feeFor(existing.items + items, batch.flash_fee, bands) - existing.feeCharged
    );

    // The lines carry the new prices too, so the order reads as it is charged.
    for (const line of one.lines) {
      const match = repriced.lines.find((row) => row.itemId === line.menu_item_id);
      if (match && match.unitPrice !== line.unit_price_at_order) {
        await db()
          .from("order_items")
          .update({ unit_price_at_order: match.unitPrice })
          .eq("id", line.id);
      }
    }

    await db()
      .from("orders")
      .update({
        batch_id: batch.id,
        subtotal_food: food,
        fee,
        total: Math.max(0, food + fee - one.discount),
      })
      .eq("id", id);
  }

  return { ok: true, orderId };
}

export type RepeatBlock = {
  name: string;
  /** Why it cannot go back in the cart, in the customer's words. */
  reason: "sold out today" | "no longer on the menu";
};

export type RepeatResult = {
  lines: RepeatLine[];
  blocked: RepeatBlock[];
};

export type RepeatLine = {
  itemId: string;
  optionIds: string[];
  name: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string;
  unitPrice: number;
  choices: string[];
  qty: number;
  forName: string;
  /** Read off the item as it is today, not as it was when they ordered:
   *  room in the car is a fact about the thing, not about the old order. */
  containerPct: number;
};

/**
 * An old order rebuilt as cart lines at today's prices. Anything taken off the
 * menu, or sold out, is left out rather than quietly repeated: a cart that
 * cannot be bought is worse than a shorter one.
 */
export async function repeatLines(order: FullOrder): Promise<RepeatResult> {
  const itemIds = [...new Set(order.lines.map((line) => line.menu_item_id))];
  if (itemIds.length === 0) return { lines: [], blocked: [] };

  // Read without a join: an embedded select that PostgREST cannot resolve
  // returns nothing, which silently emptied the whole repeat.
  const { data: items, error } = await db()
    .from("menu_items")
    .select("id, name, price_food, image_url, available, restaurant_id")
    .in("id", itemIds);
  if (error) throw new Error(error.message);

  const rows = (items ?? []) as (MenuItem & { restaurant_id: string })[];
  const byItem = new Map(rows.map((row) => [row.id, row]));

  const { data: restaurants } = await db()
    .from("restaurants")
    .select("id, name")
    .in("id", [...new Set(rows.map((row) => row.restaurant_id))]);
  const byRestaurant = new Map(
    (restaurants ?? []).map((row) => [row.id as string, row.name as string])
  );

  // The options are read back by id so a size that has since changed price is
  // repeated at what it costs now.
  const { data: chosen } = await db()
    .from("order_item_options")
    .select("order_item_id, option_id")
    .in("order_item_id", order.lines.map((line) => line.id));

  const optionIds = [
    ...new Set(
      (chosen ?? [])
        .map((row) => row.option_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const { data: options } = optionIds.length
    ? await db()
        .from("item_options")
        .select("id, name, price_delta, available")
        .in("id", optionIds)
    : { data: [] };
  const byOption = new Map((options ?? []).map((row: any) => [row.id as string, row]));

  const repeats: RepeatLine[] = [];
  const blocked: RepeatBlock[] = [];

  for (const line of order.lines) {
    const item = byItem.get(line.menu_item_id);
    if (!item) {
      blocked.push({ name: line.name, reason: "no longer on the menu" });
      continue;
    }
    if (item.available === false) {
      blocked.push({ name: item.name, reason: "sold out today" });
      continue;
    }

    const chosenHere = (chosen ?? [])
      .filter((row) => row.order_item_id === line.id)
      .map((row) => byOption.get(row.option_id as string))
      .filter((option) => option && option.available !== false);

    repeats.push({
      itemId: item.id,
      optionIds: chosenHere.map((option: any) => option.id as string),
      name: item.name,
      restaurantId: item.restaurant_id,
      restaurantName: byRestaurant.get(item.restaurant_id) ?? "",
      imageUrl: item.image_url ?? "",
      unitPrice:
        item.price_food +
        chosenHere.reduce(
          (sum: number, option: any) => sum + (option.price_delta as number),
          0
        ),
      choices: chosenHere.map((option: any) => option.name as string),
      qty: line.qty,
      forName: "",
      containerPct: pctOf(item),
    });
  }
  return { lines: repeats, blocked };
}

export type FeeStory = {
  /** Containers on this order alone. */
  items: number;
  /** Containers on that person's other orders in the same run. */
  otherItems: number;
  /** Delivery already charged on those other orders. */
  otherFee: number;
  /** What the whole load costs to carry. */
  wholeFee: number;
  /** Delivery charged on this order: the difference, when adding. */
  fee: number;
  /** A flash drop was on when this was priced. */
  flashFee: number | null;
};

/**
 * Why this order's delivery is what it is. Adding to an order already in a
 * run charges only the difference, because it is one load either way, which
 * makes a small number on a big order look wrong without the explanation.
 */
export async function feeStory(order: FullOrder): Promise<FeeStory> {
  const load = await existingLoad(order.batch_id, order.customer_phone);
  const items = order.lines.reduce((count, line) => count + line.qty, 0);

  return {
    items,
    otherItems: Math.max(0, load.items - items),
    otherFee: Math.max(0, load.feeCharged - order.fee),
    wholeFee: load.feeCharged,
    fee: order.fee,
    flashFee: order.batch.flash_fee,
  };
}

async function checkCapacity(batch: Batch): Promise<string | null> {
  if (batch.capacity === null) return null;
  const count = (await orderCounts([batch.id])).get(batch.id) ?? 0;
  return count >= batch.capacity
    ? "That batch is full. The car only holds so many boxes, so pick the next one."
    : null;
}

/** First-order detection is simply "does this phone exist in customers". */
export async function isReturningCustomer(phone: string): Promise<boolean> {
  const { data } = await db()
    .from("customers")
    .select("phone")
    .eq("phone", phone)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Writes the customer row on first order, binding the promoter code to the
 * phone number permanently. On later orders the name and hostel are refreshed
 * but `promoter_code` is deliberately never touched. That is what makes the
 * commission lifetime (brief §13, "Key rule").
 */
async function bindCustomer(args: {
  phone: string;
  name: string;
  hostel: string;
  returning: boolean;
  /** How they paid this time, kept the way the name and the block are, so
   *  somebody who always pays by card is not put back on a transfer by a new
   *  phone or a cleared browser. */
  paymentMethod?: "transfer" | "card";
  /** Who they said they heard about us from, on their first order. */
  heardFrom?: string;
}): Promise<void> {
  const way = args.paymentMethod ?? "transfer";

  if (args.returning) {
    const { error } = await db()
      .from("customers")
      .update({ name: args.name, hostel: args.hostel, payment_method: way })
      .eq("phone", args.phone);
    // The column is not there yet, so the rest of the update is worth saving
    // on its own rather than losing the lot to a migration nobody has run.
    if (error) {
      await db()
        .from("customers")
        .update({ name: args.name, hostel: args.hostel })
        .eq("phone", args.phone);
    }
    return;
  }

  // Checked against the promoters table rather than trusted: the code comes
  // off a form, and a made-up one would pay commission to nobody for ever.
  const heardFrom =
    args.heardFrom && (await realPromoter(args.heardFrom)) ? args.heardFrom.trim() : null;

  const row = {
    phone: args.phone,
    name: args.name,
    hostel: args.hostel,
    pin: newPin(),
    // Written once, on the first order, and never touched again. That single
    // column is what makes a promoter's commission lifetime.
    promoter_code: heardFrom,
  };
  const { error } = await db()
    .from("customers")
    .insert({ ...row, payment_method: way });
  if (error) await db().from("customers").insert(row);
}

export type OrderLine = OrderItem & {
  name: string;
  restaurant: string;
  /** Where whoever packs this goes to get it. Admin only, and empty for
   *  everything a restaurant makes, which is most of it. */
  source: string;
  /** "Large", "Pepperoni". What she reads out at the counter. */
  choices: string[];
};
export type GroupShare = {
  id: string;
  order_no: number | null;
  for_name: string | null;
  total: number;
  status: Order["status"];
  customer_name: string;
  customer_phone: string;
  hostel: string;
  /** That person's own food, so the page can itemise who has what. */
  lines: OrderLine[];
};
export type GroupMember = {
  id: string;
  name: string;
  phone: string;
  hostel: string;
};
export type FullOrder = Order & {
  batch: Batch;
  lines: OrderLine[];
  group: OrderGroup | null;
  shares: GroupShare[];
  /** Everyone named in the group, with a number to call. */
  members: GroupMember[];
};

/**
 * The bit of an order that belongs in a link.
 *
 * Orders carry a seven character code as well as their long identifier, and
 * every lookup already accepts either. This is what turns a freshly made
 * order into the short one, for the address somebody is about to be sent to
 * and quite possibly to paste to a friend.
 */
export async function orderLinkId(id: string): Promise<string> {
  const { data } = await db().from("orders").select("short").eq("id", id).maybeSingle();
  return (data?.short as string | null) || id;
}

export async function getOrder(id: string): Promise<FullOrder | null> {
  // Either the long identifier or the short code: every link ever sent has
  // to go on working, and the short one is what new links use.
  const { data: order } = await db()
    .from("orders")
    .select("*")
    .eq(lookupColumn(id), id)
    .maybeSingle();
  if (!order) return null;

  const batch = await getBatch(order.batch_id);
  if (!batch) return null;

  return {
    ...(order as Order),
    batch,
    lines: await linesFor([(order as Order).id]),
    group: await getGroup(order.group_id),
    shares: await sharesFor(order.group_id),
    members: await membersOf(order.group_id),
  };
}

async function getGroup(id: string | null): Promise<OrderGroup | null> {
  if (!id) return null;
  const { data } = await db().from("order_groups").select("*").eq("id", id).maybeSingle();
  return (data as OrderGroup) ?? null;
}

/** Every share of a group, so the leader can see who has not paid. */
export async function sharesFor(groupId: string | null): Promise<GroupShare[]> {
  if (!groupId) return [];
  const { data } = await db()
    .from("orders")
    .select(
      "id, order_no, for_name, total, status, customer_name, customer_phone, hostel"
    )
    .eq("group_id", groupId)
    .order("order_no");

  const rows = (data ?? []) as Omit<GroupShare, "lines">[];
  const lines = await linesFor(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    lines: lines.filter((line) => line.order_id === row.id),
  }));
}

/** Order lines with the item and restaurant names joined on. */
export async function linesFor(orderIds: string[]): Promise<OrderLine[]> {
  if (orderIds.length === 0) return [];
  const ask = (columns: string) =>
    db().from("order_items").select(columns).in("order_id", orderIds);

  // Where to get it comes back with the line, because the moment anybody
  // needs it is the moment they are looking at the order. Asked for
  // defensively: a database without that column yet refuses the whole
  // statement, and an order list is not a thing that may go blank.
  let { data, error } = await ask(
    "*, menu_items(name, source, restaurants(name)), order_item_options(name_at_order)"
  );
  if (error) {
    ({ data, error } = await ask(
      "*, menu_items(name, restaurants(name)), order_item_options(name_at_order)"
    ));
  }
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    choices: (row.order_item_options ?? []).map((o: any) => o.name_at_order),
    id: row.id,
    order_id: row.order_id,
    menu_item_id: row.menu_item_id,
    qty: row.qty,
    unit_price_at_order: row.unit_price_at_order,
    for_name: row.for_name,
    name: row.menu_items?.name ?? "(removed item)",
    restaurant: row.menu_items?.restaurants?.name ?? "Unknown",
    source: row.menu_items?.source ?? "",
  }));
}

/** The most recent order for a phone number. Powers one-tap reorder. */
export async function lastOrderForPhone(phone: string): Promise<FullOrder | null> {
  const { data } = await db()
    .from("orders")
    .select("id")
    .eq("customer_phone", phone)
    .not("status", "in", NOT_ORDERS_SQL)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? getOrder(data.id as string) : null;
}

/** An open batch this phone already has an order in, for "add to my order". */
export async function openOrderForPhone(
  phone: string
): Promise<{ batch: Batch; items: number } | null> {
  const { data } = await db()
    .from("orders")
    .select("batch_id, batches!inner(status, cut_off_at)")
    .eq("customer_phone", phone)
    .not("status", "in", NOT_ORDERS_SQL)
    .eq("batches.status", "open")
    .gt("batches.cut_off_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  const batch = await getBatch(data.batch_id as string);
  if (!batch) return null;

  const load = await existingLoad(batch.id, phone);
  return { batch, items: load.items };
}

/** Every order this phone has placed, newest first, for the history page. */
export async function ordersForPhone(phone: string): Promise<FullOrder[]> {
  const { data } = await db()
    .from("orders")
    .select("id")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = await Promise.all(
    (data ?? []).map((row) => getOrder(row.id as string))
  );
  return orders.filter((order): order is FullOrder => order !== null);
}

/**
 * One order's rating, saved the same way whoever asked.
 *
 * The website asks through a form action and the app through its own endpoint,
 * so the rules about what counts as an answer live here rather than in both.
 * Knowing the order's id is the credential, exactly as it is for reading it:
 * the link is the thing people are given.
 */
export async function saveRating(
  id: string,
  rating: number,
  note: string
): Promise<{ error: string | null }> {
  if (!id) return { error: "Something went wrong." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick between one and five stars." };
  }

  const order = await getOrder(id);
  if (!order) return { error: "That order could not be found." };
  if (order.batch.stage !== "handed_out" && order.status !== "delivered") {
    return { error: "You can rate this once it has arrived." };
  }
  if (order.status === "refunded") {
    return { error: "A refunded order cannot be rated." };
  }

  const { error } = await db()
    .from("orders")
    .update({
      rating,
      feedback: note.trim().slice(0, 500),
      rated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { error: error ? "Could not save that just now." : null };
}
