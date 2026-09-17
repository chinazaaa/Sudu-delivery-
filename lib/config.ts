// Operating constants. Everything the brief fixes as policy lives here so it
// can be changed in one place from the UK.

/** Delivery is banded by item count. See lib/fees.ts. */

/** Taken off a customer's *first* order when it carries a promoter code. */
export const FIRST_ORDER_DISCOUNT = 500;

/** Orders below this and the batch loses money. Internal, never shown. */
export const BATCH_MINIMUM = 8;

/** Nigeria does not observe DST, so this is a fixed +01:00 all year. */
export const TZ = "Africa/Lagos";

/**
 * Where a week starts before the admin sets their own. The real schedule is
 * the run_schedule table, edited under Runs; these only cover a database that
 * has not been set up yet.
 */
export const CUT_OFFS: Record<BatchSlot, { hour: number; minute: number }> = {
  afternoon: { hour: 11, minute: 30 },
  night: { hour: 18, minute: 0 },
};

export const DELIVERY_WINDOWS: Record<BatchSlot, string> = {
  afternoon: "On campus ~2:00pm",
  night: "On campus ~8:30pm",
};

export type BatchSlot = "afternoon" | "night";

export const SLOT_LABEL: Record<BatchSlot, string> = {
  afternoon: "afternoon",
  night: "night",
};

/** The fallback week: Friday only, as the brief starts (§5). */
export const RUN_WEEKDAYS = [5];

/** How far ahead batches are opened for ordering. */
export const RUN_HORIZON_DAYS = 21;
