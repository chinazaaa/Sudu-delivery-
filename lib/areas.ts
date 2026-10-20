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
 * What a second area adds on top of the dearest one.
 *
 * The rule the shop prices by is "the furthest thing in the cart", which is
 * right for a cart that is one detour: the car goes to Lekki and comes
 * back past everything else. It is wrong for a cart that is two. Lekki and
 * Ajah are not one stop at the Lekki price; they are the Lekki trip plus a
 * second shop to find, park at, queue in and carry out of, and that second
 * stop costs the same whichever two areas it is.
 *
 * So the dearest area still sets the distance, and every area after the
 * first adds this on top. Home is not one of them: every run passes
 * Sangotedo on the way back, so a Sangotedo kitchen in the cart is not a
 * detour and never was.
 */
export const MIXED_AREA_EXTRA = 1000;

export function mixedExtra(cartAreas: Area[], each = MIXED_AREA_EXTRA): number {
  const far = new Set(cartAreas.filter((one) => one.id !== "").map((one) => one.id));
  return far.size <= 1 ? 0 : Math.max(0, each) * (far.size - 1);
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
 * Where a particular run collects from, said short.
 *
 * The front page said "From: Sangotedo" whatever the run was, which is
 * true of every run and the whole story of none of them: a car that is
 * going to Lekki on Thursday is a different offer, and the one place it
 * was said was inside the checkout, after somebody had already decided we
 * do not sell what they want.
 *
 * Two names at most, joined by a slash. This is the ticket at the top of
 * the front page, not the route sheet: "Sangotedo/Lekki/Ikoyi" is a line
 * that wraps on a phone and buys nothing, and anybody who needs the whole
 * route is reading the fees section where every area is named with what it
 * adds.
 */
export function collectedFrom(
  runAreas: string | null | undefined,
  areas: Area[],
  most = 2
): string {
  /*
   * The first town in an area's name, where its name is already a list.
   *
   * An area is one driving decision and one surcharge, so a shop quite
   * reasonably calls it "Lekki/Ikoyi": one trip, two places. The ticket
   * wants one word for it, and capping the number of areas does nothing
   * when a single area's own name carries two towns in it. Only the
   * ticket shortens; the fees section still names the area in full,
   * because that is where somebody is working out what it costs.
   */
  const firstTown = (name: string): string =>
    name.split(/\s*[/,]\s*|\s+and\s+/i)[0].trim() || name.trim();

  const home = firstTown(areas.find((one) => one.id === "")?.name ?? "Sangotedo");
  const named = new Map(areas.map((one) => [one.id, firstTown(one.name)]));

  /*
   * Furthest first, because the furthest place is what the trip is.
   *
   * While there was one far area called "Lekki/Ikoyi" the order never came
   * up. Split into Ajah, Lekki and Ikoyi, the Saturday car covers all
   * three, and a ticket holding two names had to choose: in the order they
   * are set it said "Sangotedo/Ajah", which is the nearest thing on a route
   * that ends an hour past it. They are one corridor out of Sangotedo, so
   * naming the end of it is the honest short version, and the fees section
   * below names every area with what it adds.
   */
  const rest = areasOfRun(runAreas)
    .filter((id) => id !== "")
    .map((id) => areas.find((one) => one.id === id))
    .filter((one): one is Area => one !== undefined)
    .sort((a, b) => b.runExtra + b.sameDayExtra - (a.runExtra + a.sameDayExtra))
    .map((one) => named.get(one.id) ?? "")
    .filter((name) => name !== "" && name !== home);

  return [home, ...new Set(rest)].slice(0, Math.max(1, most)).join("/");
}

/**
 * Everywhere the shop collects from, named, home included.
 *
 * The front page says "KFC, Domino's and more from ___". It was filled from
 * the areas list, which is the list of places that are not home: with one
 * area named "Lekki/Ikoyi" that read as a list and nobody noticed Sangotedo
 * was missing from it. Split into three, it read "from Ajah, Lekki and
 * Ikoyi", naming three places the shop barely buys from and leaving out the
 * one fourteen of its seventeen counters are on.
 */
export function everywhere(areas: Area[], home = HOME.name): string {
  const names = [home, ...areas.filter((one) => one.id !== "").map((one) => one.name)];
  const real = [...new Set(names.map((one) => one.trim()).filter(Boolean))];
  if (real.length === 0) return home;
  if (real.length === 1) return real[0];
  return `${real.slice(0, -1).join(", ")} and ${real[real.length - 1]}`;
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
