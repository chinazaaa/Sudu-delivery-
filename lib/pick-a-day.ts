/**
 * The day somebody wants their food, and what it takes to get it there.
 *
 * The checkout used to decide this and say so: "order now, get it Wednesday
 * evening". That is the right answer to "when is the next run" and the wrong
 * answer to "I want it today", which is the question somebody actually has
 * standing in a hostel at five o'clock. A lady ordered on a Sunday evening,
 * was quietly put on Wednesday because Sunday's run had closed at one and
 * there is no Monday or Tuesday run, and had to be rung about it.
 *
 * So the day is asked for. What carries it is not: a run that day if one is
 * going, a car of its own if none is, and the price follows from which. The
 * customer picks a day and pays what that day costs. Nobody has to know what
 * a run is to buy lunch.
 */

/** A run somebody could be put on, cut down to what choosing a day needs. */
export type RunOnOffer = {
  id: string;
  /** The day it delivers, as "2026-10-25". */
  runDate: string;
};

/** A window a car of its own could come in, cut down the same way. */
export type SlotOnOffer = {
  /** The instant it is aimed at, which is what the order carries. */
  at: string;
  /** The day it lands on. */
  date: string;
};

export type DayOnOffer = {
  /** "2026-10-25". */
  date: string;
  /** The run carrying it, or null where a car of its own is the only way. */
  runId: string | null;
  /** The car window, where there is no run. Null when a run is carrying it. */
  at: string | null;
};

/**
 * Every day this cart could arrive on, soonest first.
 *
 * A run wins its day outright. Where one is going there is no reason to
 * offer a car beside it: it arrives the same evening and costs thousands
 * less, and a choice between them is a choice to pay more for nothing.
 *
 * The first run of a day wins it rather than the last. Runs come in
 * cut-off order, so the first is the one still open longest, and on a day
 * with an afternoon and a night run the afternoon one is the earlier food.
 */
export function daysOnOffer(args: {
  runs: RunOnOffer[];
  slots: SlotOnOffer[];
}): DayOnOffer[] {
  const byDate = new Map<string, DayOnOffer>();

  for (const run of args.runs) {
    if (run.runDate === "") continue;
    if (byDate.has(run.runDate)) continue;
    byDate.set(run.runDate, { date: run.runDate, runId: run.id, at: null });
  }

  for (const slot of args.slots) {
    if (slot.date === "") continue;
    // A run already has this day. The car would be dearer and no sooner.
    if (byDate.has(slot.date)) continue;
    byDate.set(slot.date, { date: slot.date, runId: null, at: slot.at });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * What to call a day in a dropdown.
 *
 * Today and tomorrow are the two anybody says in words. Past that a date is
 * clearer than counting: "in six days" is not how anybody says Saturday.
 */
export function daySaid(
  date: string,
  today: string,
  /** How the shop writes a date, so this does not have its own opinion. */
  spellOut: (date: string) => string
): string {
  if (date === today) return "Today";
  if (date === dayAfter(today)) return "Tomorrow";
  return spellOut(date);
}

/** The day after an ISO date, in the shop's own terms rather than the
 *  browser's: midday so no timezone can push it either side of midnight. */
export function dayAfter(date: string): string {
  const at = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return "";
  return new Date(at.getTime() + 86_400_000).toISOString().slice(0, 10);
}

/**
 * The day a cart should open on.
 *
 * The soonest it can come, which is what somebody ordering lunch almost
 * always wants, and what the page said before it asked at all. Picking a
 * day is a change from this rather than a hurdle in front of it.
 */
export function soonestDay(days: DayOnOffer[]): DayOnOffer | null {
  return days[0] ?? null;
}

/** The day a given choice lands on, for putting the dropdown back where the
 *  rest of the page has moved it. Null where nothing matches, which is how a
 *  run that has closed under somebody stops being selected. */
export function dayOfChoice(
  days: DayOnOffer[],
  chosen: { runId: string; at: string }
): DayOnOffer | null {
  if (chosen.at !== "") {
    return days.find((one) => one.at === chosen.at) ?? null;
  }
  return days.find((one) => one.runId === chosen.runId) ?? null;
}

/**
 * The first clock time in a window, as hours since midnight.
 *
 * Both the runs and the car windows are written by the shop in one format,
 * "between 4pm and 7pm", so the start is the first time in the string.
 * Anything it cannot read comes back null and the caller decides, because
 * guessing a time here would move money.
 */
export function windowStart(said: string): number | null {
  const found = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(said ?? "");
  if (!found) return null;
  const hour = Number(found[1]) % 12;
  const minutes = Number(found[2] ?? 0);
  const pm = found[3].toLowerCase() === "pm";
  return hour + (pm ? 12 : 0) + minutes / 60;
}

/**
 * Whether a car of its own is worth offering against a run on the same day.
 *
 * A car costs more. The only thing it buys is arriving sooner, so it has to
 * arrive properly sooner: a car between four and seven, beside a run between
 * five and seven, is paying extra for an hour that may not even happen, and
 * offering it is the shop talking somebody into the dearer thing for
 * nothing. The old code hid every car on a day with a run, which was wrong
 * the other way; this is the line between the two.
 *
 * Unreadable either side means offer it. A window the shop has written in
 * some new way is not a reason to quietly take a choice away.
 */
export const CAR_MUST_SAVE_HOURS = 2;

export function worthACar(
  runWindow: string,
  carWindow: string,
  /** The least it has to save to be worth the money, in hours. */
  leastHours = CAR_MUST_SAVE_HOURS
): boolean {
  const run = windowStart(runWindow);
  const car = windowStart(carWindow);
  if (run === null || car === null) return true;
  return run - car >= leastHours;
}
