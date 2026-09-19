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
  /** Empty means any run. */
  runs: string[];
  /** Same day window opening hours. Empty means any time. */
  windows: number[];
  firstOrderOnly: boolean;
};

export type OfferContext = {
  restaurantIds: string[];
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

  for (const offer of offers) {
    if (offer.firstOrderOnly && context.returning) continue;
    if (offer.places.length > 0) {
      if (cart.length === 0 || cart.some((id) => !offer.places.includes(id))) continue;
    }
    if (offer.runs.length > 0 && !offer.runs.includes(context.batchId)) continue;
    if (!inWindowHours(offer.windows, context.deliverAt ?? null)) continue;

    return { offer, fee: offerFee(offer, context.items) };
  }

  return null;
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
