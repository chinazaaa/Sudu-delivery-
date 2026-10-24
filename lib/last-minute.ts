/**
 * Last minute orders: a run that has closed but has not been shopped yet.
 *
 * A run closes hours before anybody drives it, and for all of those hours
 * the food has not been bought. Somebody ordering in that window is not a
 * problem to be refused, they are the best order of the evening: the car
 * is going anyway, the counter is on the route anyway, and they pay a
 * car's fee rather than a run's for driving nobody has to add.
 *
 * It stops counter by counter rather than all at once. The moment a stop
 * is ticked off it is behind her, and nothing from there can be ordered
 * again today; everything she has not reached is still on. That is the
 * whole rule, and it is the one she already keeps by hand on the run
 * sheet, so nothing new has to be remembered on the night.
 *
 * It ends when the car leaves the counters. On the road is a full boot
 * pointed at PAU, and that is the one thing that genuinely cannot take
 * another bag.
 */
import { placesOfRun, placesText } from "./run-places";

/** What the shop calls it, in one place so every page says it the same. */
export const LAST_MINUTE_SAID = "Taking last minute orders";

/** How long somebody has to pay for one before it comes off the run. */
export const PAY_WITHIN_MINUTES = 10;

export type MaybeLastMinute = {
  kind?: string | null;
  stage: string;
  status?: string | null;
};

/**
 * Whether this run is in the window where a late order can still be taken.
 *
 * Runs only. A car of its own is one person's trip and has nobody to be
 * late for, and the skincare drop is its own shop on its own day.
 */
export function takingLastMinute(batch: MaybeLastMinute): boolean {
  if ((batch.kind ?? "run") !== "run") return false;
  if (batch.status === "cancelled" || batch.status === "delivered") return false;
  return batch.stage === "closed" || batch.stage === "at_counter";
}

/**
 * The counters a late order may still draw on.
 *
 * Everything the run was already willing to stop at, less everything it
 * has been to. A run that was never fussy is willing to stop anywhere, so
 * the answer there is every counter the shop has, less the ticked ones.
 *
 * Returned in the pipe wrapped shape `only_places` already uses, so the
 * checks that keep a cart off the wrong run do this one for free. The
 * empty string cannot be used for "nowhere": it already means "anywhere",
 * which is why `anythingLeft` is asked separately.
 */
export function stillToGo(args: {
  /** The counters this run would stop at: its own list, or all of them. */
  onlyPlaces: string | null | undefined;
  /** Every counter the shop has, for a run that was never fussy. */
  everyPlace: { id: string; name: string }[];
  /** The counters already ticked off, by name, as the run sheet keeps them. */
  got: string[];
}): string {
  const wanted = placesOfRun(args.onlyPlaces);
  const allowed = wanted.length === 0 ? args.everyPlace.map((one) => one.id) : wanted;

  const behind = new Set(args.got.map((one) => one.trim().toLowerCase()));
  const nameOf = new Map(args.everyPlace.map((one) => [one.id, one.name.toLowerCase()]));

  return placesText(
    allowed.filter((id) => !behind.has(nameOf.get(id) ?? "\u0000"))
  );
}

/** Whether anything is left to order from. An empty list reads as "all of
 *  them" everywhere else, so it is never allowed to mean "none". */
export function anythingLeft(stillToGoText: string): boolean {
  return placesOfRun(stillToGoText).length > 0;
}

/** Said to whoever is looking at one, so the hurry is the point of it. */
export function payWithinSaid(minutes = PAY_WITHIN_MINUTES): string {
  return `Pay within ${minutes} minutes or it comes off the run`;
}
