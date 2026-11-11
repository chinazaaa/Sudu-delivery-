import { allAreas, areaOfEach, openDaysOfEach } from "./areas-server";
import { canGoSameDay, carGoesOn, runCovers } from "./areas";
import { runArrival } from "./arrival";
import { openBatches } from "./batches";
import { runCarries } from "./run-places";
import { opensOn } from "./open-days";
import { hoursByDay, safeSettings } from "./settings";
import { deliverySlots, slotsWorthOffering } from "./same-day";
import { dayAfter } from "./pick-a-day";
import { lagosToday } from "./time";
import { toBatchView } from "./view";

/** When a counter's food next arrives, as a pill: said, and whether it is today. */
export type ShopDelivery = { said: string; today: boolean };

/**
 * Whether each counter is delivered today, and if not, the day it next is.
 *
 * Worked out the way the cart works out the day its food goes: only the runs
 * that reach the counter's area and stop at it, on a day it is open, with a
 * car of its own where one can go. So a pill on a counter can never promise
 * a day the cart would then refuse.
 */
export async function deliveryFor(ids: string[]): Promise<Record<string, ShopDelivery>> {
  const out: Record<string, ShopDelivery> = {};
  if (ids.length === 0) return out;

  const [batches, settings, areas, areaOf, openDaysOf] = await Promise.all([
    openBatches(),
    safeSettings(),
    allAreas(),
    areaOfEach(),
    openDaysOfEach(),
  ]);
  const today = lagosToday();
  const runs = batches
    .slice(0, 4)
    .map(toBatchView)
    .filter((view) => !view.closed && !view.full)
    .map(runArrival);
  const slots =
    settings.same_day_on === "on"
      ? slotsWorthOffering(
          deliverySlots(new Date(), await hoursByDay(), settings.order_horizon_days || 7),
          batches.map((one) => ({ run_date: one.run_date, window: one.delivery_window_text }))
        )
      : [];

  for (const id of ids) {
    const area = areas.filter((one) => one.id === (areaOf[id] ?? ""));
    const usable = runs.filter(
      (run) =>
        runCovers(run.areas ?? "", area) &&
        runCarries(run.onlyPlaces ?? "", [id]) &&
        opensOn(openDaysOf[id], run.runDate)
    );
    const cars = canGoSameDay(area)
      ? slots.filter((slot) => carGoesOn(area, slot.date, opensOn))
      : [];
    // The earliest way it can get there, a shared run or a car of its own:
    // somebody asking when it comes wants the soonest day, not the cheapest.
    const soonest = [...usable].sort((a, b) => a.runDate.localeCompare(b.runDate))[0];
    const carDate = [...cars].map((slot) => slot.date).sort()[0] ?? "";
    const runDate = soonest?.runDate ?? "";
    const dates = [runDate, carDate].filter((one) => one !== "").sort();
    const date = dates[0] ?? "";
    const going = date !== "";
    if (!going) {
      out[id] = { said: "No delivery day yet", today: false };
    } else if (date === today) {
      out[id] = { said: "Delivers today", today: true };
    } else if (date === dayAfter(today)) {
      out[id] = { said: "Next delivery tomorrow", today: false };
    } else {
      const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "long",
        timeZone: "UTC",
      });
      out[id] = { said: `Next delivery ${weekday}`, today: false };
    }
  }
  return out;
}
