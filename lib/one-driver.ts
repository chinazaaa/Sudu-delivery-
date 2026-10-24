/**
 * One driver, one trip at a time.
 *
 * The scheduled run and a car of its own overlap on the clock: a car can
 * be booked until the evening, and tonight's run closes in the afternoon
 * and is driven after that. Two things on one calendar is fine. Two things
 * on one person is not. She cannot drop a boot-load at PAU, come back out
 * for one bag and be at the hostel for both, and the shop finds that out
 * by having sold it.
 *
 * So while the run is out, cars of their own are shut. Not from the moment
 * the run closes, which is only a deadline and may be hours before she
 * leaves, but from the moment she is actually out buying it: at the
 * counter, on the road, at the drop. Handed out and she is free again.
 */
export const OUT_STAGES = ["at_counter", "on_the_road", "at_drop"] as const;

export type DrivingNow = {
  /** "same_day", "parcel", or empty for an ordinary run. */
  kind?: string | null;
  stage: string;
  /** The day it delivers. Only today's run is being driven today. */
  run_date?: string | null;
  status?: string | null;
};

/**
 * Whether somebody is out driving right now.
 *
 * A parcel is not this: it is its own trip on a day agreed with whoever
 * sent it, and it is not what the one driver is doing this evening.
 * Cancelled is nothing at all.
 */
export function driverIsOut(runs: DrivingNow[], today: string): boolean {
  return runs.some(
    (run) =>
      (run.kind ?? "") !== "parcel" &&
      (run.status ?? "") !== "cancelled" &&
      (run.run_date ?? "") === today &&
      (OUT_STAGES as readonly string[]).includes(run.stage)
  );
}

/** Said to whoever is looking at a shut car, so it reads as tonight
 *  rather than as broken. */
export const OUT_SAID =
  "Our driver is out on tonight's run, so a car of its own cannot go until she is back. The next run is still open.";
