/**
 * A counter's own sale, passed through.
 *
 * Black Friday belongs to the restaurants: one does buy one get one free, the
 * next takes a third off a bucket. When a counter cuts its price our cost
 * falls, and the only two things we can do with that are pass it on or keep
 * it. Keeping it is how somebody who has seen the poster decides the shop is
 * expensive, on the one weekend of the year when everybody is comparing. So
 * the deal price is the shop's price, and the markup stays a markup.
 *
 * The ordinary price is never touched. A deal is a second price with an end
 * on it, and when that end passes the ordinary one is simply what is charged
 * again: nothing has to be remembered, restored or tidied up, and there is no
 * night where the counters have gone back to full price and we are still
 * selling at half. That is the whole reason the end date is not optional.
 *
 * Buy one get one free is not a price, so it is not this: it is sold as its
 * own line on the menu, "two for one", priced at one and counted as two in
 * the car. The counter sells it that way and so do we.
 */

/** What a row needs to carry for any of this to be asked of it. */
export type DealRow = {
  price_food: number;
  price_cost?: number | null;
  /** The sale price while it runs. Null or zero means no sale. */
  deal_price?: number | null;
  /** What we pay at the counter while the sale runs, where that has changed
   *  too. Zero means the usual cost still stands: a counter can cut what it
   *  charges us without us cutting what we charge. */
  deal_cost?: number | null;
  /** When it stops. No end, no deal: see above. */
  deal_until?: string | null;
};

/** Whether this row is on sale at a given moment. */
export function dealLive(row: DealRow, now: Date = new Date()): boolean {
  const price = Number(row.deal_price ?? 0);
  const until = (row.deal_until ?? "").trim();
  if (price <= 0 || until === "") return false;
  const ends = new Date(until).getTime();
  if (!Number.isFinite(ends)) return false;
  // Cheaper than the ordinary price or it is not a deal. A "sale" that costs
  // more is somebody typing in the wrong box, and it must not be charged.
  return ends > now.getTime() && price < Number(row.price_food ?? 0);
}

/** What to charge for one of these, this minute. */
export function sellingNow(row: DealRow, now: Date = new Date()): number {
  return dealLive(row, now)
    ? Number(row.deal_price ?? 0)
    : Number(row.price_food ?? 0);
}

/** What it was before the sale, for printing with a line through it. Zero
 *  where there is no sale, so nothing is struck out on an ordinary day. */
export function wasPrice(row: DealRow, now: Date = new Date()): number {
  return dealLive(row, now) ? Number(row.price_food ?? 0) : 0;
}

/** What we pay at the counter for one, this minute. The run sheet and the
 *  profit page both ask, and during a sale the counter charges less. */
export function costNow(row: DealRow, now: Date = new Date()): number {
  const deal = Number(row.deal_cost ?? 0);
  return dealLive(row, now) && deal > 0 ? deal : Number(row.price_cost ?? 0);
}

/** How much off, as a percentage, for the tag on the card. Rounded down, so
 *  a third off never reads as 34%. */
export function dealOff(row: DealRow, now: Date = new Date()): number {
  if (!dealLive(row, now)) return 0;
  const was = Number(row.price_food ?? 0);
  const is = Number(row.deal_price ?? 0);
  if (was <= 0) return 0;
  return Math.floor(((was - is) / was) * 100);
}

/**
 * How long is left, said the way somebody reads a deadline.
 *
 * Days while there are days, hours inside a day, minutes in the last hour.
 * A sale with four minutes left is a different sentence from one with four
 * days left, and "ends 27/11/2026, 23:59" is neither.
 */
export function dealLeft(row: DealRow, now: Date = new Date()): string {
  if (!dealLive(row, now)) return "";
  const ends = new Date(row.deal_until ?? "").getTime();
  const left = ends - now.getTime();
  if (left <= 0) return "";

  const minutes = Math.floor(left / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} left`;
}
