/**
 * The bag of ice block that goes with ice cream.
 *
 * Ice cream bought at four and handed over at seven is soup, and the
 * route being arranged around it is only half the answer: the other half
 * is a bag of ice block in the boot with it. That is a real thing somebody
 * buys and pays for, so it is a line on the order rather than a few
 * hundred naira hidden inside the price of a sundae.
 *
 * One bag, whatever the order is. Ten tubs and one tub need the same bag,
 * so it is never two, and it is not optional: an order that needs it and
 * does not have it is an order that arrives melted.
 *
 * Which items need it is ticked in admin, item by item, because it is not
 * a thing about a counter. Cold Stone is all ice cream and Domino's sells
 * one dessert among forty pizzas, and the small ice creams in the shop
 * next to the kettles ride along in a cool box instead and need nothing.
 */

/** A cart line, as little of one as this needs to know. */
export type IceLine = {
  menu_item_id: string;
  qty: number;
};

/**
 * Whether anything here has to travel on ice.
 *
 * `needsIce` is the set of item ids ticked in admin.
 */
export function wantsIce(lines: IceLine[], needsIce: Set<string>): boolean {
  return lines.some((line) => needsIce.has(line.menu_item_id) && line.qty > 0);
}

/**
 * The same cart with the bag of ice on it.
 *
 * Exactly one, added only where something needs it and there is not one
 * already: somebody who put a bag in the cart themselves has one, and two
 * bags for one boot is money nobody owes.
 *
 * Returns the lines unchanged where the shop has not said which item the
 * ice block is, which is how every order worked before this existed. A
 * missing setting must never be the thing that refuses an order.
 */
export function withIce<T extends IceLine>(
  lines: T[],
  needsIce: Set<string>,
  iceItemId: string,
  makeLine: (itemId: string) => T
): T[] {
  if (iceItemId === "" || !wantsIce(lines, needsIce)) return lines;
  if (lines.some((line) => line.menu_item_id === iceItemId)) return lines;
  return [...lines, makeLine(iceItemId)];
}

/**
 * The cart with the ice left out, for counting how much car it takes.
 *
 * The bag is the shop's answer to a problem the customer's order created,
 * not another thing they asked for, and letting it count would push a
 * three item order onto the four item rung: two thousand naira of
 * delivery for a bag of ice costing twelve fifty. It travels in the same
 * boot either way.
 */
export function withoutIce<T extends IceLine>(lines: T[], iceItemId: string): T[] {
  if (iceItemId === "") return lines;
  return lines.filter((line) => line.menu_item_id !== iceItemId);
}

/** What it is called where somebody has not named it. */
export const ICE_SAID = "Bag of ice block";
