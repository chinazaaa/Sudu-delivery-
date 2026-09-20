import type { Slot } from "./same-day";

/**
 * When an order lands, worked out rather than asked for.
 *
 * There used to be a dropdown on every screen that took an order: pick a
 * window, or pick a run, with two prices side by side. It asked somebody to
 * know the fee ladder, the cut off and the three hours it takes to fetch food
 * and drive it over before they could buy lunch, and the commonest answer to
 * it was the wrong one: a car of its own at six and a half, twenty minutes
 * before a run went to the same block for four.
 *
 * So nobody picks any more. There is one soonest way to eat and this works it
 * out, the same way on every screen: the checkout, a link somebody was sent,
 * the admin making that link, and a group.
 */
export type ArrivalRun = {
  id: string;
  /** The day it goes, as a date, so today can be told from tomorrow. */
  runDate: string;
  /** "Between 12pm and 3pm, today", already said the way it is read. */
  when: string;
};

export type Arrival = {
  /** The run it goes on. Empty means a car of its own. */
  runId: string;
  /** The instant that car has to be ready for. Empty means it is on a run. */
  at: string;
  /** What to put on the screen, said as a window. */
  when: string;
  /** Whether this is a shared run, which is what makes it the cheaper one. */
  onARun: boolean;
};

/**
 * The soonest way to eat, in the order somebody would pick it themselves if
 * they could see the whole board.
 *
 * A run going today is four thousand for food this afternoon, so it wins
 * outright. Failing that a car of its own is six and a half but it is still
 * today, which is the thing actually being bought. Failing that it is
 * tomorrow, and a run tomorrow beats a car tomorrow for the same hours and
 * less money. Last of all is tomorrow's first window, which is whenever the
 * shop opens.
 */
export function nextArrival(
  runs: ArrivalRun[],
  slots: Slot[],
  today: string
): Arrival | null {
  const onRun = (run: ArrivalRun): Arrival => ({
    runId: run.id,
    at: "",
    when: run.when,
    onARun: true,
  });
  const onItsOwn = (slot: Slot): Arrival => ({
    runId: "",
    at: slot.at,
    when: slot.label,
    onARun: false,
  });

  const runToday = runs.find((one) => one.runDate === today);
  if (runToday) return onRun(runToday);

  const slotToday = slots.find((one) => one.day === "today");
  if (slotToday) return onItsOwn(slotToday);

  // Anything after today, soonest first. The lists arrive in order, so the
  // first one past today is the next one there is.
  const runLater = runs.find((one) => one.runDate > today);
  if (runLater) return onRun(runLater);

  const slotLater = slots.find((one) => one.day !== "today");
  if (slotLater) return onItsOwn(slotLater);

  // A run whose date cannot be read against today is still a run going
  // somewhere, which beats telling somebody there is no way to get food.
  return runs[0] ? onRun(runs[0]) : slots[0] ? onItsOwn(slots[0]) : null;
}

/**
 * Said the same way everywhere, because it is the same promise.
 *
 * Four o'clock on the dot is a thing nobody can do in Lagos traffic, and
 * arriving at a quarter past is perfectly fine unless somebody was told four
 * o'clock exactly. So the time is an estimate and says so, in one sentence,
 * in the same words on every screen that shows one.
 */
export const ESTIMATE_NOTE =
  "This is an estimate, not a time to the minute. Half an hour either way is normal, and you are called when the food is at your block.";

/** A run, said the way an arrival is said: the window, then the day. */
export function runArrival(run: {
  id: string;
  runDate: string;
  deliveryWindow: string;
  label: string;
}): ArrivalRun {
  return {
    id: run.id,
    runDate: run.runDate,
    // The label carries the day word already worked out against the shop's
    // clock ("today · Lunch"), so the day is taken from it rather than
    // worked out a second time and risking a different answer.
    when: `${run.deliveryWindow}, ${run.label.split(" · ")[0]}`,
  };
}
