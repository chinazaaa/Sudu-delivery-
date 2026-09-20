import { aroundPhrase, type Slot } from "./same-day";

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
  /** The same thing inside a sentence: "get it between 12pm and 3pm today".
   *  A capital B mid sentence is the tell that a label has been dropped into
   *  prose without being read. */
  said: string;
};

export type Arrival = {
  /** The run it goes on. Empty means a car of its own. */
  runId: string;
  /** The instant that car has to be ready for. Empty means it is on a run. */
  at: string;
  /** What to put on the screen, said as a window. */
  when: string;
  /** The same thing inside a sentence, with the day always said: "between
   *  4pm and 6pm today". */
  said: string;
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
    said: run.said,
    onARun: true,
  });
  const onItsOwn = (slot: Slot): Arrival => {
    // A car of its own is three hours out, so what is promised is that time:
    // "around 4:30pm", not the whole block the shop divides the day into,
    // which reads as a three hour wait. The day is always said, because a
    // time on its own reads as today whatever day it is on.
    const said = `${aroundPhrase(slot.at)} ${slot.day}`;
    return {
      runId: "",
      at: slot.at,
      when: said.charAt(0).toUpperCase() + said.slice(1),
      said,
      onARun: false,
    };
  };

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
  // The label carries the day word already worked out against the shop's
  // clock ("today · Lunch"), so the day is taken from it rather than worked
  // out a second time and risking a different answer.
  const day = run.label.split(" · ")[0];
  return {
    id: run.id,
    runDate: run.runDate,
    when: `${run.deliveryWindow}, ${day}`,
    said: `${run.deliveryWindow.charAt(0).toLowerCase()}${run.deliveryWindow.slice(1)} ${day}`,
  };
}
