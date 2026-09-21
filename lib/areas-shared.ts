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
