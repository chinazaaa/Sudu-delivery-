import { db } from "./supabase";
import { lagosInstant, lagosToday } from "./time";

/**
 * A box on a day of its own.
 *
 * A care package is not a pizza. It has to be sourced, priced, packed and
 * then carried, and none of that fits the run that goes out tonight at six.
 * So a collection can be asked for on a day the customer picks, and it gets
 * a trip of its own on that day.
 *
 * The trip is a batch like everything else, so the run sheet, the stages and
 * the money all keep working. It is kind 'box', which is what keeps it out
 * of the list a hungry person picks from: that list only ever asks for runs.
 */

/** Two clear days to find it, buy it and pack it. Sooner than that is urgent. */
export const STANDARD_DAYS = 2;

/** The day after tomorrow, which is the soonest a standard box can go. */
export function soonestStandard(today: string = lagosToday()): string {
  return shift(today, STANDARD_DAYS);
}

/** Whether a day is soon enough to count as urgent, and cost the urgent fee. */
export function isUrgent(day: string, today: string = lagosToday()): boolean {
  return day < soonestStandard(today);
}

/** A day a fortnight out, as far ahead as anything here is planned. */
export function furthest(today: string = lagosToday()): string {
  return shift(today, 21);
}

/** Days added to a yyyy-mm-dd date, done at midday so no zone can move it. */
function shift(day: string, by: number): string {
  const at = new Date(`${day}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + by);
  return at.toISOString().slice(0, 10);
}

/**
 * The trip this box will travel on, made now.
 *
 * `wanted` empty means they said any day is fine. It still needs a date to
 * stand on, so it is put a week out and marked as not agreed: their page
 * says a day is being agreed rather than naming one nobody has promised.
 */
export async function tripForBox(
  wanted: string,
  label: string
): Promise<{ id: string; date: string } | null> {
  const date = wanted !== "" ? wanted : shift(lagosToday(), 7);

  const { data, error } = await db()
    .from("batches")
    .insert({
      run_date: date,
      slot: "afternoon",
      // The end of the day it is for, so nothing reads as already shut. A
      // box is not a run and has no cut-off anybody is racing.
      cut_off_at: lagosInstant(date, 23, 59),
      delivery_window_text: label,
      status: "open",
      capacity: null,
      flash_fee: null,
      flash_fee_reason: "",
      stage: "ordering",
      stage_updated_at: new Date().toISOString(),
      kind: "box",
      fuel_cost: 0,
      food_spend: 0,
      driver_cost: 0,
      other_cost: 0,
      cost_note: "",
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return { id: data.id as string, date };
}

/** Whether a repeat somebody asked for is one the shop offers. */
export function readRepeat(raw: unknown): "" | "weekly" | "fortnightly" | "monthly" {
  const said = String(raw ?? "").trim();
  return said === "weekly" || said === "fortnightly" || said === "monthly" ? said : "";
}

/** "Every month", for saying out loud. Empty where it is a one-off. */
export function repeatSaid(every: string): string {
  return every === "weekly"
    ? "Every week"
    : every === "fortnightly"
      ? "Every two weeks"
      : every === "monthly"
        ? "Every month"
        : "";
}
