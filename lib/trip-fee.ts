import { tripFee, type Trip } from "./fees";
import { sameDayPricing } from "./settings";
import { bandsFor } from "./skincare";

/**
 * What this trip's delivery costs, with the ladders fetched for you.
 *
 * The pure rule lives in fees.ts and takes both ladders as arguments,
 * which is right for testing it and tedious at twenty call sites: every
 * one of them had to remember that there are two ladders, which is
 * exactly the thing they kept forgetting. This is the same question with
 * the remembering done once.
 *
 * Use it anywhere a delivery fee is needed from a batch. The only callers
 * that should still reach for feeFor or sameDayFee directly are the ones
 * splitting a fee between people in a group, which is a different sum.
 */
export async function feeOnTrip(
  batch: Trip | null | undefined,
  items: number,
  /** Only where the customer chose an urgent slot, never on a move. */
  urgent = false
): Promise<number> {
  const [run, car] = await Promise.all([
    bandsFor(batch as { kind?: string } | null),
    sameDayPricing(),
  ]);
  return tripFee(batch, items, {
    run,
    car: car.bands,
    urgentExtra: car.urgentExtra,
    urgent,
  });
}
