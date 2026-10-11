import { lagosInstant } from "./time";
import { areasOfRun, type Area } from "./areas";

/**
 * How long an empty run is allowed to stay open.
 *
 * A run with nothing on it has nothing to collect, so its cut-off is not
 * protecting anything: it is only stopping the one person who was going to
 * order at two o'clock. Three hours before the last delivery of the day is
 * the point where it stops being possible to go and fetch the food, which
 * is the real deadline the cut-off was standing in for.
 */
export const EMPTY_RUN_HOURS = 3;

/**
 * How long after closing the first delivery can realistically be.
 *
 * Enough to drive out, collect and come back. Only used to word the new
 * window, never to decide whether to hold a run open.
 */
export const COLLECT_HOURS = 1;

/** "4pm", "4:30pm", "12pm". The clock as this shop writes it. */
export function clockWord(hour: number, minute = 0): string {
  const half = hour >= 12 ? "pm" : "am";
  const show = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${show}${half}` : `${show}:${String(minute).padStart(2, "0")}${half}`;
}

/**
 * When a run that is still empty should actually close.
 *
 * Measured back from the last delivery of the day, which is a fact about
 * the shop rather than about this run: a quiet run can be held until there
 * is no longer time to fetch the food and get it to a block before the
 * shop stops delivering, whatever its own window happened to say.
 *
 * Null means close it now, which is what every run did before this and
 * what every run still does the moment it has an order on it.
 */
export function emptyRunClosesAt(
  batch: {
    run_date: string;
    delivery_window_text?: string;
    kind?: string;
    /** Which areas this car goes to, beyond Sangotedo, as "|l|". */
    areas?: string | null;
  },
  now: Date = new Date(),
  /** Every area the shop delivers from, as admin has them. */
  areas: Area[] = [],
  /** The latest a run ever delivers, as an hour of the Lagos clock. */
  lastHour = 19
): string | null {
  // Only shared runs. A same-day car, a parcel and a box day each have a
  // cut-off that means something of its own, and a box being packed on the
  // day is not waiting for company.
  if (batch.kind !== undefined && batch.kind !== "run") return null;

  // A car going somewhere far cannot be held to three hours, because three
  // hours is not enough to get there and back. That is not a new judgement:
  // it is the same one an area already carries. sameDay is off for exactly
  // the areas where three hours does not cover the trip, which is why a car
  // of its own is never offered to them, and it is the same three hours
  // here. So a run that goes anywhere with it off keeps its cut-off.
  //
  // Read off the flag rather than off the name, so the far area the shop
  // adds next is covered the day somebody ticks the box in admin, with
  // nobody having to remember this sum exists.
  const goes = areasOfRun(batch.areas);
  if (areas.some((one) => !one.sameDay && goes.includes(one.id))) return null;

  const held = new Date(
    new Date(lagosInstant(batch.run_date, lastHour, 0)).getTime() -
      EMPTY_RUN_HOURS * 3600 * 1000
  );

  // Already past it: the run is late rather than quiet, and closes.
  return held.getTime() > now.getTime() ? held.toISOString() : null;
}

/**
 * What the delivery window becomes once a run has been held open.
 *
 * The window admin wrote was built around a cut-off that no longer applies.
 * Leaving "Between 3:30pm and 5:30pm" over a run that now closes at four
 * promises a delivery before ordering has even shut, which is worse than
 * moving it: a time nobody can meet is read as a time we did not bother to
 * keep.
 *
 * So it runs from about an hour after the new close, which is the drive
 * out and back, to the last delivery of the day, which is where the new
 * close was measured from in the first place.
 */
export function windowAfterHolding(heldISO: string, lastHour = 19): string {
  const held = new Date(heldISO);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hour12: false,
    }).format(held)
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      minute: "2-digit",
    }).format(held)
  );

  const from = hour + COLLECT_HOURS;
  // Never a window that starts after it ends, which a run held right up
  // against the last hour would otherwise produce.
  if (from >= lastHour) return `By ${clockWord(lastHour)}`;
  return `Between ${clockWord(from, minute)} and ${clockWord(lastHour)}`;
}
