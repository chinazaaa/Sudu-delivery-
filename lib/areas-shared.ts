import type { ValueBand } from "./value-bands";
import type { StepFee } from "./step-fee";

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

/** Whether this kitchen prices by what the shopping comes to. */
export function pricesByValue(
  restaurantId: string,
  byKitchen: Record<string, ValueBand[]>
): boolean {
  return (byKitchen[restaurantId] ?? []).length > 0;
}

/**
 * The box ladder a cart is priced by, where anything in it has one.
 *
 * Dearest wins where two do, for the same reason the area does: one car
 * fetches all of it, and the harder half of the trip is what it costs.
 *
 * The browser's copy of the server's rule, so the number on the checkout
 * and the number on the bill come from the same sentence. The server
 * decides it again when the order is placed; this only quotes it.
 */
export function stepsFor(
  itemIds: string[],
  byItem: Record<string, StepFee>
): StepFee | null {
  let worst: StepFee | null = null;
  for (const id of itemIds) {
    const one = byItem[id];
    if (!one) continue;
    if (worst === null || one.firstFee > worst.firstFee) worst = one;
  }
  return worst;
}

/** Whether this thing is priced by the cool box. */
export function pricesByStep(
  itemId: string,
  byItem: Record<string, StepFee>
): boolean {
  return byItem[itemId] !== undefined;
}
