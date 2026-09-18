import {
  DELIVERY_LEAD_HOURS,
  FIRST_DELIVERY_HOUR,
  LAST_DELIVERY_HOUR,
  isUrgent,
  sameDayFee,
  type Band,
} from "./fees";
import { lagosInstant, lagosToday } from "./time";

export type Slot = {
  /** The instant it lands, as an ISO string. */
  at: string;
  /** "12:30pm", or "12:30pm tomorrow", as it reads in the dropdown. */
  label: string;
  /** Which day it lands on, for grouping and for the wording. */
  day: "today" | "tomorrow";
  urgent: boolean;
};

/**
 * Every time somebody can ask for, soonest first.
 *
 * Between noon and six, on the half hour, and never sooner than it actually
 * takes: to the restaurant, wait for the food, drive it over. Three hours.
 * Offering half past one at one o'clock would be promising the impossible.
 *
 * Nothing goes out after six, so ordering at five has nothing left today. It
 * rolls into tomorrow rather than turning somebody away: five o'clock today
 * means noon tomorrow, which is a real answer and an empty list is not.
 */
export function deliverySlots(now: Date = new Date()): Slot[] {
  const earliest = now.getTime() + DELIVERY_LEAD_HOURS * 3_600_000;
  const today = lagosToday(now);
  const tomorrow = nextDay(today);
  const slots: Slot[] = [];

  for (const [date, day] of [
    [today, "today"],
    [tomorrow, "tomorrow"],
  ] as const) {
    for (let hour = FIRST_DELIVERY_HOUR; hour <= LAST_DELIVERY_HOUR; hour++) {
      for (const minute of [0, 30]) {
        if (hour === LAST_DELIVERY_HOUR && minute > 0) break;

        const at = lagosInstant(date, hour, minute);
        if (new Date(at).getTime() < earliest) continue;

        const clock = clockOf(hour, minute);
        slots.push({
          at,
          label: day === "today" ? clock : `${clock} tomorrow`,
          day,
          // Tomorrow is always more than five hours off, so it can never be
          // urgent. That falls out of the clock rather than being a rule.
          urgent: isUrgent(new Date(at), now),
        });
      }
    }
  }

  return slots;
}

/** Only what is left today, for anything that should not promise tomorrow. */
export function slotsToday(now: Date = new Date()): Slot[] {
  return deliverySlots(now).filter((slot) => slot.day === "today");
}

function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** "12:30pm", the way a time is said rather than the way a clock prints it. */
function clockOf(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "pm" : "am";
  const shown = hour > 12 ? hour - 12 : hour;
  return minute === 0 ? `${shown}${suffix}` : `${shown}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** What that slot would cost, for showing beside it before anybody commits. */
export function slotFee(slot: Slot, items: number, bands?: Band[]): number {
  return sameDayFee(items, slot.urgent, bands);
}
