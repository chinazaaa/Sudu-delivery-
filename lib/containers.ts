/**
 * How much of the car one thing takes.
 *
 * Delivery is priced by how much room an order fills, and until now every
 * line counted as one: a bottle of Coke was a pizza box. Four drinks with a
 * pizza pushed an order from ₦4,000 to ₦6,000, which is ₦2,000 of delivery
 * for ₦3,200 of soft drink, and it was the fastest way to talk somebody out
 * of a drink they wanted.
 *
 * It runs the other way too. A restaurant's own deal is one line on the menu
 * and three pizza boxes in the boot, so a car that the numbers said had room
 * for eight was full at three.
 *
 * So an item says what it really is, as a percentage of a container. A drink
 * is 25, four of them making one. A three-pizza deal is 300. Everything else
 * is 100 and nothing changes for it.
 */
export const ONE_CONTAINER = 100;

/** A drink: four of them fill one container's worth of room. */
export const DRINK = 25;

/**
 * What a line is worth, defaulting to a whole container.
 *
 * Undefined rather than zero on purpose: before the column exists every item
 * reads as undefined, and the shop must price exactly as it did yesterday
 * rather than making every order free.
 */
export function pctOf(of: { container_pct?: number | null } | null | undefined): number {
  const pct = of?.container_pct;
  return typeof pct === "number" && Number.isFinite(pct) && pct >= 0
    ? Math.round(pct)
    : ONE_CONTAINER;
}

/**
 * Containers in a cart.
 *
 * Rounded down, which is the generous way and the one that can be said in a
 * sentence: four drinks make a container, so three are free. Never less than
 * one, because a car still has to go even if all anybody wanted was a Coke.
 */
export function containersIn(
  lines: { qty: number; container_pct?: number | null }[]
): number {
  const total = lines.reduce((sum, line) => sum + line.qty * pctOf(line), 0);
  return Math.max(1, Math.floor(total / ONE_CONTAINER));
}
