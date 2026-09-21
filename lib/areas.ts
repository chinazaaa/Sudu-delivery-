import type { Band } from "./fees";

/**
 * Where a restaurant is, and what that adds to a delivery.
 *
 * The shop was built around Sangotedo, twenty minutes from campus, so one
 * ladder was the whole truth. A kitchen further out is a longer trip: the
 * same order, the same number of bags, more road. Charging the Sangotedo
 * price for it is losing money on every order without noticing.
 *
 * An area rather than a price per restaurant, because the cost is the
 * distance and not the kitchen: four places on the same street should not be
 * four numbers to keep in step.
 *
 * And an extra on top of the ladder rather than a ladder of its own. The
 * ladder says how much room an order takes, which does not change with the
 * distance, so Lekki is Sangotedo plus the petrol at every band. It also
 * means an area cannot quietly undercut the home one.
 */
export type Area = {
  /** What a restaurant row holds. Empty is home. */
  id: string;
  name: string;
  /** Added to a shared run, and to a car of its own. */
  runExtra: number;
  sameDayExtra: number;
  /**
   * Whether a car of its own can go there at all.
   *
   * Three hours is the whole promise of a car of its own: fetch it, drive it
   * over. An hour each way to somewhere further out eats that before the
   * kitchen has started, so the honest answer for a far area is that it
   * rides a run or it does not come, rather than a promise broken on the day.
   */
  sameDay: boolean;
};

/** Sangotedo, or wherever the ladders were written for. No extra by definition. */
export const HOME: Area = {
  id: "",
  name: "Sangotedo",
  runExtra: 0,
  sameDayExtra: 0,
  sameDay: true,
};

export function parseAreas(json: string | null | undefined): Area[] {
  if (!json || !json.trim()) return [];
  try {
    const raw = JSON.parse(json) as Area[];
    return raw
      .filter((one) => typeof one?.id === "string" && one.id.trim() !== "")
      .map((one) => ({
        id: one.id.trim(),
        name: (one.name ?? one.id).trim() || one.id.trim(),
        runExtra: Math.max(0, Math.round(Number(one.runExtra) || 0)),
        sameDayExtra: Math.max(0, Math.round(Number(one.sameDayExtra) || 0)),
        // Off unless it says otherwise, because promising a car in three
        // hours to somewhere an hour away is a promise broken on the day.
        sameDay: one.sameDay === true,
      }));
  } catch {
    return [];
  }
}

export function serialiseAreas(areas: Area[]): string {
  return JSON.stringify(
    areas
      .filter((one) => one.id.trim() !== "")
      .map((one) => ({
        id: one.id.trim(),
        name: one.name.trim() || one.id.trim(),
        runExtra: Math.max(0, Math.round(one.runExtra || 0)),
        sameDayExtra: Math.max(0, Math.round(one.sameDayExtra || 0)),
        sameDay: one.sameDay === true,
      }))
  );
}

/**
 * The area a cart is priced by: the furthest thing in it.
 *
 * One car has to fetch all of it, so the trip is as long as its longest leg.
 * Nobody pays two delivery fees for one order, and nobody is quietly charged
 * the Sangotedo price for a car that drove to Lekki.
 */
export function dearestArea(
  areas: Area[],
  restaurantIds: string[],
  areaOf: Record<string, string>
): Area {
  const found = restaurantIds
    .map((id) => areaOf[id] ?? "")
    .map((name) => areas.find((one) => one.id === name))
    .filter((one): one is Area => one !== undefined);

  return found.reduce(
    (worst, one) => (one.runExtra + one.sameDayExtra > worst.runExtra + worst.sameDayExtra ? one : worst),
    HOME
  );
}

/**
 * The ladder as that area charges it: every band up by the same amount.
 *
 * Every band, because the petrol to Lekki is the same petrol whether the car
 * carries two bags or twelve. Moving only the entry fee would make a big
 * order to Lekki cost the same as a big order to Sangotedo, which is the one
 * place the money actually goes.
 */
export function withExtra(bands: Band[], extra: number): Band[] {
  if (extra <= 0) return bands;
  return bands.map((band) => ({ ...band, fee: band.fee + extra }));
}

/** Every area a cart touches, home included only when something is from it. */
export function areasIn(
  areas: Area[],
  restaurantIds: string[],
  areaOf: Record<string, string>
): Area[] {
  const ids = [...new Set(restaurantIds.map((id) => areaOf[id] ?? ""))];
  return ids.map((id) => areas.find((one) => one.id === id) ?? HOME);
}

/**
 * Whether a car of its own can carry this cart.
 *
 * One thing from a far area is enough to make the whole order a run: the car
 * has to fetch all of it, and it cannot be in two places in three hours.
 */
export function canGoSameDay(cartAreas: Area[]): boolean {
  return cartAreas.every((one) => one.sameDay);
}

/** The way a run records what it covers, so a filter is an exact match. */
export function areaText(ids: string[]): string {
  const real = [...new Set(ids.filter((one) => one.trim() !== ""))];
  return real.length === 0 ? "" : `|${real.join("|")}|`;
}

/** Which areas a run covers. Home is always one of them. */
export function areasOfRun(text: string | null | undefined): string[] {
  return [
    "",
    ...(text ?? "")
      .split("|")
      .map((one) => one.trim())
      .filter(Boolean),
  ];
}

/**
 * Whether this run can carry this cart.
 *
 * A run is a car with a route. It always passes Sangotedo, and it goes
 * anywhere else only if somebody said so when it was made: a Thursday run
 * that was never going to Lekki cannot pick up a Lekki order because
 * somebody put one in the basket.
 */
export function runCovers(runAreas: string, cartAreas: Area[]): boolean {
  const covered = areasOfRun(runAreas);
  return cartAreas.every((one) => covered.includes(one.id));
}
