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

/**
 * A thing you add to an order rather than a thing you order.
 *
 * Extra mozzarella, a pot of pepper sauce, bacon on a pizza. Every one of
 * these has a page of its own, because every menu item does, and none of
 * them is a page anybody could ever arrive at from a search: nobody looks
 * for "Mozzarella Cheese 3,500" and a page saying only that is the thin
 * content Google declines to index.
 *
 * Thirty-four of them were sitting in the crawl queue ahead of real dishes
 * on a site where eight hundred dish pages are still waiting to be crawled
 * for the first time. They stay on the menu and stay orderable, exactly as
 * they are; they are simply not offered to search engines.
 *
 * Read off the category rather than a list of names, because the kitchens
 * file them perfectly well themselves: Extra toppings, Add-ons, Sauces,
 * Sauce Dips, Dips & sides.
 */
export function isExtra(category: string | null | undefined): boolean {
  return /topping|add[- ]?on|sauce|dip/i.test(String(category ?? ""));
}
