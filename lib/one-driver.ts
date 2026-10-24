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
 * So while the run is committed, today's cars are shut. Committed means
 * on the road or at the drop: the boot is full, the car is pointed at PAU
 * and she cannot drop that lot and come back out for one bag. Handed out
 * and she is free again.
 *
 * Being at the counters is not that, and shutting it there cost the shop
 * money. A counter she has not reached yet is a counter she can buy one
 * more thing at on the way, and that order pays the whole fee for driving
 * the shop was doing anyway. The hour she is shopping is the best hour of
 * the evening to sell one, not the worst.
 *
 * Today's, and only today's. Tomorrow is a different day and she is not
 * driving tonight's run on it, so a car booked for tomorrow afternoon was
 * never the thing that clashed.
 */
export const OUT_STAGES = ["on_the_road", "at_drop"] as const;

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

/**
 * The times still worth offering, given who is driving what.
 *
 * Whoever is out is out for the rest of today, so today's times go and
 * every later day stays. Nobody out and nothing is dropped at all.
 */
export function carsStillDrivable<T extends { date: string }>(
  slots: T[],
  driving: boolean,
  today: string
): T[] {
  if (!driving) return slots;
  return slots.filter((one) => one.date !== today);
}

/** Said to whoever is looking at a shut car, so it reads as tonight
 *  rather than as broken. */
export const OUT_SAID =
  "Our driver is on the road with tonight's run, so a car of its own cannot go today. Pick a time tomorrow, or put it on the next run.";

/**
 * Why today's cars are not on offer, where they are not.
 *
 * Two reasons, and they are different sentences. One is that she is out
 * with the boot full and cannot come back for one bag. The other is that
 * a run is going today anyway: a car of its own exists for the evenings
 * when nothing is, and selling one beside an open run sells somebody a
 * six and a half thousand naira trip the shop was making at four, to
 * arrive at the same hour. Offering it is not a choice, it is a worse
 * deal with extra steps.
 */
export const RUN_INSTEAD_SAID =
  "A run is going today, so this goes on that: it gets there the same evening and costs less than a car of its own.";
