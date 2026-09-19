import { naira } from "./money";

/**
 * Promotions, judged against a cart.
 *
 * Kept away from anything that touches the database on purpose: the checkout
 * runs this in somebody's browser and the order runs it on the server, and
 * they have to agree. A fee quoted on one screen and charged on the next has
 * to be one number, and the only way to be sure of that is one function.
 */

/**
 * A promotion with its rules attached, ready to be judged against a cart.
 *
 * The judging is a pure function below, and this is what it needs. Both the
 * checkout in the browser and the order being placed on the server run that
 * same function on this same shape, because a delivery fee quoted on one
 * screen and charged on another has to be the same number.
 */
export type LiveOffer = {
  code: string;
  note: string;
  fee: number;
  includedItems: number | null;
  extraPerItem: number;
  /** Empty means anywhere. */
  places: string[];
  /** Particular dishes this is for. Empty means it is not about dishes. */
  items: string[];
  /** Empty means any run. */
  runs: string[];
  /** Same day window opening hours. Empty means any time. */
  windows: number[];
  firstOrderOnly: boolean;
  /** In a group the fee splits, but never below this each. */
  minEach: number;
};

export type OfferContext = {
  restaurantIds: string[];
  /** Every dish in the cart, for an offer that is about particular ones. */
  itemIds?: string[];
  items: number;
  batchId: string;
  deliverAt?: string | null;
  returning: boolean;
};

/**
 * The promotion this cart has earned, and what delivery costs under it.
 *
 * Whole cart or nothing: an offer for one counter is an offer for one trip,
 * and a cart with somebody else's food in it is two stops. It stands down
 * rather than half applying, and the ordinary ladder prices the order.
 */
export function pickOffer(
  offers: LiveOffer[],
  context: OfferContext
): { offer: LiveOffer; fee: number } | null {
  const cart = [...new Set(context.restaurantIds)];
  const earned: { offer: LiveOffer; fee: number }[] = [];

  for (const offer of offers) {
    if (offer.firstOrderOnly && context.returning) continue;
    if (offer.places.length > 0) {
      if (cart.length === 0 || cart.some((id) => !offer.places.includes(id))) continue;
    }
    // An offer for particular dishes is earned by those dishes. Two of them
    // together still earn it; anything else in the cart does not, because it
    // was the dish that was worth the trip and not whatever rode along.
    if (offer.items.length > 0) {
      const dishes = context.itemIds ?? [];
      if (dishes.length === 0 || dishes.some((id) => !offer.items.includes(id))) continue;
    }
    if (offer.runs.length > 0 && !offer.runs.includes(context.batchId)) continue;
    if (!inWindowHours(offer.windows, context.deliverAt ?? null)) continue;

    earned.push({ offer, fee: offerFee(offer, context.items) });
  }

  if (earned.length === 0) return null;

  // Two offers can be on at once, and a cart can qualify for both. The
  // cheaper one wins rather than whichever the database happened to return
  // first, because the alternative is a price that changes for no reason
  // anybody can see.
  return earned.sort(
    (one, two) => one.fee - two.fee || one.offer.code.localeCompare(two.offer.code)
  )[0];
}

/**
 * What a promotion charges for this much food.
 *
 * Flat is the headline, and the taper is the boot: two thousand covers three
 * items, and the fourth costs five hundred like the fourth of anything else.
 * A cliff would have been simpler to write and worse to be on the wrong side
 * of, because an offer that silently stops applying reads as a bug.
 */
export function offerFee(offer: LiveOffer, items: number): number {
  if (offer.includedItems === null || offer.extraPerItem <= 0) return offer.fee;
  return offer.fee + Math.max(0, items - offer.includedItems) * offer.extraPerItem;
}

/**
 * Whether a delivery time falls in one of the windows an offer names.
 *
 * The windows on offer slide through the day as it gets late, so an offer
 * pinned to an instant would stop matching by two o'clock. It is pinned to
 * the hour a window opens instead, and a time belongs to it if it falls
 * inside the three hours that window covers.
 *
 * No windows named means every window, and a run is not a window at all, so
 * an order on a run is never held back by this.
 */
export function inWindowHours(hours: number[], deliverAt: string | null): boolean {
  if (hours.length === 0) return true;
  if (!deliverAt) return true;

  // Lagos is UTC+1 all year, so the hour there is the hour here plus one.
  const hour = (new Date(deliverAt).getUTCHours() + 1) % 24;
  return hours.some((from) => hour >= from && hour < from + 3);
}

/**
 * The offer in a few words, for a badge on a card.
 *
 * It says the price rather than teasing one. "Promo inside" makes somebody
 * tap to find out whether it is worth anything; the number is the reason to
 * tap, so it goes on the outside.
 */
export function offerBadge(offer: LiveOffer): string {
  return offer.fee === 0 ? "Free delivery" : `${naira(offer.fee)} delivery`;
}

/** The same offer said properly, for the banner on a restaurant's page. */
export function offerLine(offer: LiveOffer): string {
  if (offer.fee === 0) return "Delivery is free.";
  const taper =
    offer.includedItems !== null && offer.extraPerItem > 0
      ? ` for up to ${offer.includedItems} item${offer.includedItems === 1 ? "" : "s"}, then ${naira(offer.extraPerItem)} each`
      : ", however much you order";
  return `Delivery is ${naira(offer.fee)}${taper}.`;
}

/**
 * What each person in a car pays under a promotion.
 *
 * The offer is for the trip, so it splits: one person pays all of it, two pay
 * half each. The floor is what stops it running to nothing as a group grows,
 * because the counter and the drive cost the same whether five people or
 * twenty are waiting for the bags.
 *
 * Rounded up to the hundred like every other share, so the shop is never left
 * short of the fee it has to cover.
 */
export function offerShare(offer: LiveOffer, items: number, people: number): number {
  if (people < 1) return 0;
  const whole = offerFee(offer, items);
  return Math.max(Math.ceil(whole / people / 100) * 100, offer.minEach);
}
