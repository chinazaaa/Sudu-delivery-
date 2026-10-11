import { lagosInstant } from "./time";

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
  batch: { run_date: string; delivery_window_text: string; kind?: string },
  now: Date = new Date()
): string | null {
  // Only shared runs. A same-day car, a parcel and a box day each have a
  // cut-off that means something of its own, and a box being packed on the
  // day is not waiting for company.
  if (batch.kind !== undefined && batch.kind !== "run") return null;

  const ends = windowEndsAt(batch.delivery_window_text, batch.run_date);
  if (ends === null) return null;

  const held = new Date(new Date(ends).getTime() - EMPTY_RUN_HOURS * 3600 * 1000);
  // Already past it: the run is late rather than quiet, and closes.
  return held.getTime() > now.getTime() ? held.toISOString() : null;
}
