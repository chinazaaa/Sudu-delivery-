import { getBatch, isOrderable, openBatches } from "./batches";
import { hoursByDay, safeSettings } from "./settings";
import { deliverySlots, sameInstant, windowPhrase } from "./same-day";
import { toBatchView } from "./view";
import { lagosToday } from "./time";
import { nextArrival, runArrival, type Arrival } from "./arrival";

/**
 * When something ordered right now would land, worked out on the server.
 *
 * The shop's clock, not the phone's, and the same order of preference
 * everywhere: a run going today while it is still taking orders, a car of its
 * own today, a run tomorrow, tomorrow's first window.
 *
 * A link made before links stopped being pinned may still name a run or a
 * time. It is honoured while it is live, and quietly let go when it is not,
 * because "that run has closed" is a dead end where there is always another
 * way to eat. There is no such thing as nothing going: if not today, then
 * tomorrow.
 */
export async function arrivalNow(pinned?: {
  batchId: string | null;
  deliverAt: string | null;
}): Promise<Arrival | null> {
  const [settings, open] = await Promise.all([safeSettings(), openBatches()]);
  const slots =
    settings.same_day_on === "on" ? deliverySlots(new Date(), await hoursByDay()) : [];

  if (pinned?.batchId) {
    const batch = await getBatch(pinned.batchId);
    if (batch && isOrderable(batch)) {
      const view = toBatchView({ ...batch, order_count: 0, full: false });
      return { runId: view.id, at: "", when: runArrival(view).when, onARun: true };
    }
  }

  if (pinned?.deliverAt && slots.some((slot) => sameInstant(slot.at, pinned.deliverAt!))) {
    return {
      runId: "",
      at: pinned.deliverAt,
      when: windowPhrase(pinned.deliverAt).replace(/^./, (one) => one.toUpperCase()),
      onARun: false,
    };
  }

  return nextArrival(
    open
      .map(toBatchView)
      .filter((one) => !one.closed && !one.full)
      .map(runArrival),
    slots,
    lagosToday()
  );
}
