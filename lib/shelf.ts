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

/** Whether a shelf is one the food side of the shop shows. */
export function onTheMenu(kind: string | null | undefined): boolean {
  const it = kind ?? "food";
  return it !== "skincare" && it !== OWN;
}
