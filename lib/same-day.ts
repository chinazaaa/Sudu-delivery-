import {
  DELIVERY_LEAD_HOURS,
  FIRST_DELIVERY_HOUR,
  LAST_DELIVERY_HOUR,
  isUrgent,
  sameDayFee,
  type Band,
} from "./fees";
import { lagosInstant, lagosToday } from "./time";
import { TZ } from "./config";

export type Slot = {
  /** The start of the window, as an ISO string. It is what the trip has to
   *  be ready for and what the price is worked out from. */
  at: string;
  /** "Between 12pm and 3pm", as it reads in the dropdown. */
  label: string;
  /** The same thing inside a sentence: "get it between 12pm and 3pm". A
   *  capital B mid sentence is the tell that a label has been dropped into
   *  prose without being read. */
  phrase: string;
  /** Which day it lands on, for grouping and for the wording. */
  day: "today" | "tomorrow";
  urgent: boolean;
};

/**
 * How long a delivery window is.
 *
 * A list of half hours asks somebody to pick a minute for food arriving from
 * a restaurant in Lagos traffic, which is a promise nobody can keep and a
 * decision nobody wants to make. A window is the honest version of the same
 * answer, and it is the one people already use when they say "this
 * afternoon".
 */
const WINDOW_HOURS = 3;

/**
 * Every window somebody can ask for, soonest first.
 *
 * Between the hours admin set, in blocks, and never sooner than it actually
 * takes: to the restaurant, wait for the food, drive it over. Three hours.
 * A window is offered only when its start is that far off, because the start
 * is the earliest the food might turn up.
 *
 * Nothing goes out after closing, so ordering late has nothing left today. It
 * rolls into tomorrow rather than turning somebody away, which is a real
 * answer where an empty list is not.
 */
export function deliverySlots(
  now: Date = new Date(),
  hours:
    | { first: number; last: number }
    | ((weekday: number) => { first: number; last: number; off?: boolean }) = {
    first: FIRST_DELIVERY_HOUR,
    last: LAST_DELIVERY_HOUR,
  }
): Slot[] {
  // Either one pair for the whole week, or a pair per day. Saturday can open
  // at noon while a Wednesday starts at three, and tomorrow is a different
  // day from today, so this is asked per date rather than once.
  const hoursOn = (date: string): { first: number; last: number; off?: boolean } =>
    typeof hours === "function"
      ? hours(new Date(`${date}T12:00:00Z`).getUTCDay())
      : hours;

  const earliest = now.getTime() + DELIVERY_LEAD_HOURS * 3_600_000;
  const today = lagosToday(now);
  const tomorrow = nextDay(today);
  const slots: Slot[] = [];

  for (const [date, day] of [
    [today, "today"],
    [tomorrow, "tomorrow"],
  ] as const) {
    // The first window starts at opening, or at the first hour that is far
    // enough away, whichever is later. Walking a fixed grid instead would
    // throw away a perfectly deliverable afternoon: at one o'clock the noon
    // block has gone and the three o'clock block is too soon, so there would
    // be nothing today at all, when between four and six is an easy yes.
    const open = hoursOn(date);
    // A day the shop does not go out on offers nothing, rather than offering
    // a window nobody will drive.
    if (open.off) continue;

    let opening = open.first;
    while (
      opening < open.last &&
      new Date(lagosInstant(date, opening, 0)).getTime() < earliest
    ) {
      opening += 1;
    }

    for (let from = opening; from < open.last; from += WINDOW_HOURS) {
      // The last block is whatever is left rather than running past closing:
      // a day ending at two is noon to two, not noon to three.
      const to = Math.min(from + WINDOW_HOURS, open.last);

      const at = lagosInstant(date, from, 0);
      if (new Date(at).getTime() < earliest) continue;

      const window = `between ${clockOf(from, 0)} and ${clockOf(to, 0)}`;
      const said = day === "today" ? window : `${window} tomorrow`;
      slots.push({
        at,
        label: said.charAt(0).toUpperCase() + said.slice(1),
        phrase: said,
        day,
        // Worked out from the start, because that is the earliest somebody
        // could be standing at their block waiting for it.
        urgent: isUrgent(new Date(at), now),
      });
    }
  }

  return slots;
}

/** Only what is left today, for anything that should not promise tomorrow. */
export function slotsToday(
  now: Date = new Date(),
  hours?: { first: number; last: number }
): Slot[] {
  return deliverySlots(now, hours).filter((slot) => slot.day === "today");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** "12:30pm", the way a time is said rather than the way a clock prints it. */
/**
 * A time somebody asked for, said as the window it means.
 *
 * A same day car is kept as the instant it has to be ready, because that is
 * what the price is worked out from. Nobody waiting for lunch thinks in
 * instants, and the windows on offer change through the day, so this builds
 * the sentence from the time itself rather than looking it up in a list that
 * may have moved on: "between 12pm and 3pm", and tomorrow said as tomorrow.
 */
export function windowPhrase(at: string, now: Date = new Date()): string {
  const start = new Date(at);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false })
      .format(start)
  );
  const window = `between ${clockOf(hour, 0)} and ${clockOf(hour + WINDOW_HOURS, 0)}`;

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(start);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  if (day === today) return window;

  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(
    new Date(now.getTime() + 86_400_000)
  );
  return day === tomorrow ? `${window} tomorrow` : `${window}, ${day}`;
}

export function clockOf(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "pm" : "am";
  const shown = hour > 12 ? hour - 12 : hour;
  return minute === 0 ? `${shown}${suffix}` : `${shown}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** What that slot would cost, for showing beside it before anybody commits. */
export function slotFee(slot: Slot, items: number, bands?: Band[]): number {
  return sameDayFee(items, slot.urgent, bands);
}
