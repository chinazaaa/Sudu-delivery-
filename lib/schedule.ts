import { db } from "./supabase";
import { CUT_OFFS, DELIVERY_WINDOWS, RUN_WEEKDAYS, type BatchSlot } from "./config";

export type ScheduledRun = {
  id: string;
  weekday: number;
  slot: BatchSlot;
  /** "11:30", Lagos time. */
  cut_off: string;
  window_text: string;
  active: boolean;
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * The week as the admin has set it. Which days run, when ordering closes on
 * each, and when each lands. Falls back to what the brief starts with, so a
 * database without the table yet still opens its Friday runs.
 */
export async function runSchedule(includeHidden = false): Promise<ScheduledRun[]> {
  try {
    let query = db().from("run_schedule").select("*").order("weekday").order("cut_off");
    if (!includeHidden) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as ScheduledRun[];
    if (rows.length > 0) {
      // Postgres hands back "11:30:00"; the time input and the parser want "11:30".
      return rows.map((row) => ({ ...row, cut_off: row.cut_off.slice(0, 5) }));
    }
  } catch {
    /* No table yet. The default below still opens Friday. */
  }

  return RUN_WEEKDAYS.flatMap((weekday) =>
    (["afternoon", "night"] as BatchSlot[]).map((slot) => ({
      id: `${weekday}-${slot}`,
      weekday,
      slot,
      cut_off: `${String(CUT_OFFS[slot].hour).padStart(2, "0")}:${String(
        CUT_OFFS[slot].minute
      ).padStart(2, "0")}`,
      window_text: DELIVERY_WINDOWS[slot],
      active: true,
    }))
  );
}
