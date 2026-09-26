/**
 * What counts as a shop somebody can walk into.
 *
 * Not every row in `restaurants` is a restaurant. The skincare shelf is the
 * same shop on a different day, with its own basket and its own car. And a
 * collection needs things no restaurant sells: a birthday cake that is not
 * any bakery's cake, a bunch of flowers, a bucket. Those are ours, they have
 * a price, and they belong in a box and nowhere else.
 *
 * So they live on a shelf of our own, which the box builder can see and the
 * shop front cannot. Without this, a flower would stand in the food list
 * between a burger and a bowl of rice, and /r/sudu would be a restaurant
 * page for a shop that does not exist.
 */

/** Our own shelf: real products, priced, sold only inside a box. */
export const OWN = "own";

/**
 * Whether a shelf is one the food side of the shop shows.
 *
 * Our own shelf is on it. It was hidden while it held nothing but the parts
 * boxes are packed from, and the moment it held a bucket, a towel and a box
 * of chocolate that was a shop with the lights off: real products, real
 * prices, and no way for anybody to buy one on its own.
 *
 * Skincare stays out, because it is not a different shelf of the same shop.
 * It has its own basket, its own car and its own day.
 */
export function onTheMenu(kind: string | null | undefined): boolean {
  return (kind ?? "food") !== "skincare";
}
