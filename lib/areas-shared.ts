import type { ValueBand } from "./value-bands";

/**
 * The dearest of the value ladders a cart touches, which is how it is
 * charged.
 *
 * Dearest wins where two do, for the same reason the area does: one car
 * fetches all of it, and the harder half of the trip is what it costs.
 *
 * Its own file because both the browser and the server ask it, and the
 * server half of the areas code talks to the database, which a browser
 * cannot.
 */
export function ladderFor(
  restaurantIds: string[],
  byKitchen: Record<string, ValueBand[]>
): ValueBand[] {
  return restaurantIds
    .map((id) => byKitchen[id])
    .filter((one): one is ValueBand[] => Array.isArray(one) && one.length > 0)
    .reduce<ValueBand[]>((worst, one) => (top(one) > top(worst) ? one : worst), []);
}

const top = (bands: ValueBand[]) => bands[bands.length - 1]?.fee ?? 0;

/**
 * Whether every kitchen in the cart prices by what the shopping comes to.
 *
 * An empty cart is not a market: nothing in it means nothing to charge by
 * value, and the ordinary ladder answers.
 */
export function allByValue(
  restaurantIds: string[],
  byKitchen: Record<string, ValueBand[]>
): boolean {
  return (
    restaurantIds.length > 0 &&
    restaurantIds.every((id) => (byKitchen[id] ?? []).length > 0)
  );
}
