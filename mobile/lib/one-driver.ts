import type { Shop, Slot } from "@/lib/api";

/**
 * The car-day rules, copied from the website (lib/one-driver.ts,
 * lib/same-day.ts, lib/open-days.ts) so a phone offers the same days.
 *
 * A car of its own is hidden by a run only if that run could carry THIS
 * cart. The server sends raw slots; this does the rest.
 */

const WINDOW_HOURS = 3;
const BACK_IN_TIME_HOURS = 1;

/** The hours a run's delivery window covers, read out of its words. */
export function windowHours(text: string): { from: number; to: number } | null {
  const found = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi)].map((one) => {
    const hour = Number(one[1]) % 12;
    return one[3].toLowerCase() === "pm" ? hour + 12 : hour;
  });
  if (found.length === 0) return null;
  return { from: found[0], to: found.length > 1 ? found[found.length - 1] : found[0] };
}

/** The hour of the day an instant falls on, where the shop is. */
export function lagosHourOf(at: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hour12: false,
    }).format(new Date(at))
  );
}

function lagosDateOf(at: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(at));
}

/**
 * Times still worth offering, given the runs that could carry the cart.
 * A window a run covers across the whole of it is the better deal.
 */
export function slotsWorthOffering<T extends { at: string }>(
  slots: T[],
  runs: { run_date: string; window: string }[]
): T[] {
  const covered = runs
    .map((run) => ({ date: run.run_date, hours: windowHours(run.window) }))
    .filter((one): one is { date: string; hours: { from: number; to: number } } => one.hours !== null);
  if (covered.length === 0) return slots;

  return slots.filter((slot) => {
    const date = lagosDateOf(slot.at);
    const from = lagosHourOf(slot.at);
    const to = from + WINDOW_HOURS;
    return !covered.some((run) => run.date === date && run.hours.from <= from && run.hours.to >= to);
  });
}

/** The car times still worth offering on a day a run is going. */
function carsBeforeTheRun<T extends { date: string; hour: number }>(
  slots: T[],
  runStart: Record<string, number>,
  runEnd: Record<string, number>
): T[] {
  return slots.filter((one) => {
    const starts = runStart[one.date];
    if (starts === undefined) return true;
    if (one.hour <= starts - BACK_IN_TIME_HOURS) return true;
    const ends = runEnd[one.date];
    return ends === undefined ? false : one.hour >= ends + BACK_IN_TIME_HOURS;
  });
}

/**
 * The car times still worth offering, given the runs that could carry THIS
 * cart. A run that skips the cart's area or counters hides nothing.
 */
export function carsClearOfRuns<T extends { date?: string; at: string }>(
  slots: T[],
  carrying: { runDate: string; window: string }[]
): T[] {
  const starts: Record<string, number> = {};
  const ends: Record<string, number> = {};
  for (const run of carrying) {
    const hours = windowHours(run.window);
    if (!hours || run.runDate === "") continue;
    starts[run.runDate] = Math.min(starts[run.runDate] ?? hours.from, hours.from);
    ends[run.runDate] = Math.max(ends[run.runDate] ?? hours.to, hours.to);
  }
  const timed = slots.map((one) => ({
    date: one.date ?? lagosDateOf(one.at),
    hour: lagosHourOf(one.at),
    one,
  }));
  return carsBeforeTheRun(timed, starts, ends).map((row) => row.one);
}

/** The weekdays each kitchen is open, as the shop sends them. Empty text is
 *  every day, and a kitchen not listed is open every day. */
export function openDaysOf(shop: Shop | null): Record<string, string> {
  return (shop as { openDaysOf?: Record<string, string> } | null)?.openDaysOf ?? {};
}

/** Whether a kitchen is open on a date. */
export function opensOn(text: string | null | undefined, date: string): boolean {
  if (!date) return true;
  const said = String(text ?? "")
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one !== "")
    .map(Number)
    .filter((one) => Number.isInteger(one) && one >= 0 && one <= 6);
  if (said.length === 0) return true;
  return said.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

/** The soonest day a kitchen is open, from a date on. */
export function nextOpenDay(text: string | null | undefined, from: string): string {
  const at = new Date(`${from}T12:00:00Z`);
  for (let ahead = 0; ahead < 8; ahead += 1) {
    const date = new Date(at.getTime() + ahead * 86_400_000).toISOString().slice(0, 10);
    if (opensOn(text, date)) return date;
  }
  return from;
}

/**
 * The car times this cart can really have: not hidden by a run that could
 * carry it, and not on a day any counter in the cart is shut. The caller
 * has already dropped them if a car cannot go to the cart's areas.
 */
export function carDaysFor(
  slots: Slot[],
  carrying: { runDate: string; window: string }[],
  kitchens: string[],
  shop: Shop | null
): Slot[] {
  const open = openDaysOf(shop);
  const clear = carsClearOfRuns(
    slotsWorthOffering(
      slots,
      carrying.map((run) => ({ run_date: run.runDate, window: run.window }))
    ),
    carrying
  );
  return clear.filter((one) => kitchens.every((id) => opensOn(open[id], one.date ?? "")));
}

/** "Saturday", for a date, in the shop's calendar. */
export function weekdayName(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "long" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

/** A day said the way people say it: today, tomorrow, or "Saturday, 14 Nov". */
export function dayWord(date: string, today: string): string {
  if (date === today) return "today";
  const next = new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (date === next) return "tomorrow";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}
