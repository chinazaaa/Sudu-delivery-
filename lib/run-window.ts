import { lagosInstant } from "./time";
import { areasOfRun, type Area } from "./areas";

/**
 * How long an empty run is allowed to stay open.
 *
 * A run with nothing on it has nothing to collect, so its cut-off is not
 * protecting anything: it is only stopping the one person who was going to
 * order at two o'clock. Three hours before the last delivery is the point
 * where it stops being possible to go and fetch the food, which is the real
 * deadline the cut-off was standing in for.
 */
export const EMPTY_RUN_HOURS = 3;

/**
 * The end of a delivery window, as an instant.
 *
 * The window is free text, written in admin: "Between 5pm and 7pm", or
 * "Between 3:30pm and 5:30pm". There is no column holding the end of it,
 * and inventing one would mean rewriting every run ever scheduled, so it is
 * read back out of the sentence.
 *
 * The last time named wins, because every way of writing a window puts the
 * end of it last. Anything this cannot read returns null, and a null is
 * always treated as "leave the run alone": a cut-off moved on the strength
 * of a sentence nobody could parse is a run that closes at the wrong time.
 */
export function windowEndsAt(windowText: string, runDate: string): string | null {
  const said = String(windowText ?? "").toLowerCase();

  // Hour, optional minutes, optional am/pm. Collected rather than matched
  // once, so "between 5pm and 7pm" gives both and the second is taken.
  const found = [...said.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/g)]
    .map((one) => ({
      hour: Number(one[1]),
      minute: Number(one[2] ?? 0),
      half: one[3] ?? "",
    }))
    .filter((one) => one.hour >= 1 && one.hour <= 24 && one.minute < 60);

  const last = found.at(-1);
  if (!last) return null;

  // "Between 5pm and 7pm" marks only the end, so an unmarked time takes the
  // am/pm of whatever was marked. Failing that, a delivery window runs in
  // the afternoon and evening: a bare "7" is seven at night, never seven in
  // the morning, because nothing is delivered to a hostel at dawn.
  const half = last.half || found.find((one) => one.half !== "")?.half || "";
  let hour = last.hour;
  if (half === "pm" && hour < 12) hour += 12;
  else if (half === "am" && hour === 12) hour = 0;
  else if (half === "" && hour < 12) hour += 12;

  if (hour > 23) return null;
  return lagosInstant(runDate, hour, last.minute);
}

/**
 * When a run that is still empty should actually close.
 *
 * Null means close it now, which is what every run did before this and what
 * every run still does the moment it has an order on it.
 */
export function emptyRunClosesAt(
  batch: {
    run_date: string;
    delivery_window_text: string;
    kind?: string;
    /** Which areas this car goes to, beyond Sangotedo, as "|l|". */
    areas?: string | null;
  },
  now: Date = new Date(),
  /** Every area the shop delivers from, as admin has them. */
  areas: Area[] = []
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
  const far = areas.some((one) => !one.sameDay && goes.includes(one.id));
  if (far) return null;

  const ends = windowEndsAt(batch.delivery_window_text, batch.run_date);
  if (ends === null) return null;

  const held = new Date(new Date(ends).getTime() - EMPTY_RUN_HOURS * 3600 * 1000);
  // Already past it: the run is late rather than quiet, and closes.
  return held.getTime() > now.getTime() ? held.toISOString() : null;
}
