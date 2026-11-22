import { carsOnOffer } from "./batches";
import { deliverySlots } from "./same-day";
import { dayWord } from "./time";
import { SLOT_LABEL } from "./config";
import { clockLabel } from "./time";
import { feeForTrip, type FullOrder } from "./orders";
import { hoursByDay, safeSettings } from "./settings";
import type { Batch } from "./types";

/** One place an unpaid order could go, said the way the page says it. */
export type MoveChoice = {
  /** A shared delivery's id, or "" for a car of its own. */
  id: string;
  /** The moment a car is aimed at. Empty for a shared delivery. */
  at: string;
  label: string;
  closes: string;
  /** What its delivery would come to, for the order as it stands. Absent
   *  where it is not worth saying, as on a paid order. */
  fee?: number;
  /** A car of its own rather than a shared delivery. */
  car: boolean;
};

/**
 * Every day this order could go on, with what delivery would cost there.
 *
 * Shared deliveries first, because they are the cheaper way to get food
 * there. Then, for any day nobody shared is going, the car of its own the
 * shop would send: Monday and Tuesday where there is no delivery but a car
 * can still go. A day a shared delivery already has is not offered as a car
 * as well; it would cost more and arrive no sooner.
 *
 * Cars and fees are for an order not yet paid. A paid order moves as it is,
 * so it only needs the shared deliveries and no prices.
 */
export async function moveChoicesFor(
  order: FullOrder,
  runs: Batch[],
  opts: { cars: boolean; fees: boolean }
): Promise<MoveChoice[]> {
  const shared: MoveChoice[] = await Promise.all(
    runs.map(async (run) => ({
      id: run.id,
      at: "",
      label: `${dayWord(run.run_date)} · ${SLOT_LABEL[run.slot]}`,
      closes: `Closes ${clockLabel(run.cut_off_at)}, ${run.delivery_window_text}`,
      fee: opts.fees ? await feeForTrip(order, run).catch(() => undefined) : undefined,
      car: false,
    }))
  );

  if (!opts.cars) return shared;

  const settings = await safeSettings();
  if (settings.same_day_on !== "on") return shared;

  const slots = await carsOnOffer(
    deliverySlots(new Date(), await hoursByDay(), settings.order_horizon_days || 7)
  ).catch(() => []);

  const haveRun = new Set(runs.map((run) => run.run_date));
  const firstOfDay = new Map<string, (typeof slots)[number]>();
  for (const slot of slots) {
    if (haveRun.has(slot.date) || firstOfDay.has(slot.date)) continue;
    firstOfDay.set(slot.date, slot);
  }

  // A car's price does not depend on the day, only on what is in it, so it
  // is worked out once.
  const carFee = firstOfDay.size > 0
    ? await feeForTrip(order, { kind: "same_day" }).catch(() => undefined)
    : undefined;

  const cars: MoveChoice[] = [...firstOfDay.values()].map((slot) => ({
    id: "",
    at: slot.at,
    label: `${dayWord(slot.date)} · own car`,
    closes: slot.window.charAt(0).toUpperCase() + slot.window.slice(1),
    fee: opts.fees ? carFee : undefined,
    car: true,
  }));

  // By day, so Monday sits between Sunday and Wednesday rather than at the
  // end of the list.
  const dateOf = (choice: MoveChoice, index: number) =>
    choice.car
      ? [...firstOfDay.values()].find((slot) => slot.at === choice.at)?.date ?? ""
      : runs.find((run) => run.id === choice.id)?.run_date ?? String(index);
  return [...shared, ...cars]
    .map((choice, index) => ({ choice, date: dateOf(choice, index) }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => row.choice);
}
