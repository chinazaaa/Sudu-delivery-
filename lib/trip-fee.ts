import { areaOfCart } from "./areas-server";
import { tripFee, type Trip } from "./fees";
import { bandsFor, isSkincareBatch } from "./skincare";

/**
 * What this trip's delivery costs, off the ladders this cart is charged.
 *
 * There are two ladders, a run's and a car's, and every rung of both moves
 * with where the food is coming from: how far the dearest counter is, and
 * what a second area costs as an extra stop. Six things on a car is eight
 * and a half thousand off the bare ladder and ten across Ajah and
 * Sangotedo, and the difference is not a rounding error, it is the trip.
 *
 * Every place that needed a fee used to assemble this itself, and the ones
 * that forgot a part of it quietly undercharged. Forgetting which kind of
 * trip it was cost four thousand on a move; forgetting the areas would
 * have cost fifteen hundred on every mixed cart. So the whole question is
 * asked in one place, and the only thing a caller has to know is which
 * counters the food is coming from.
 */
export async function feeOnTrip(
  batch: Trip | null | undefined,
  items: number,
  /** Which counters the food comes from. The areas, and so the extras,
   *  are worked out from these: without them the ladder is the bare one
   *  and every mixed cart is undercharged. */
  restaurantIds: string[],
  /** Only where the customer chose an urgent slot, never on a move. */
  urgent = false
): Promise<number> {
  const where = await areaOfCart(restaurantIds);
  return tripFee(batch, items, {
    run: isSkincareBatch(batch as { kind?: string } | null)
      ? await bandsFor(batch as { kind?: string } | null)
      : where.bands,
    car: where.sameDayBands,
    urgentExtra: where.urgentExtra,
    urgent,
  });
}
