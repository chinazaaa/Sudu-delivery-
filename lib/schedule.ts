import { db } from "./supabase";
import { CUT_OFFS, DELIVERY_WINDOWS, RUN_WEEKDAYS, type BatchSlot } from "./config";

export type ScheduledRun = {
  id: string;
  weekday: number;
  slot: BatchSlot;
  /** "11:30", Lagos time. */
  cut_off: string;
  /** When the run lands, as two times on a clock. "15:00" and "18:00".
   *  Empty on a row written before these existed, which has wording only. */
  window_from: string;
  window_to: string;
  /** What customers read. Written from the two times above, and kept as its
   *  own column because every message, page and card already reads it. */
  window_text: string;
  /** Where these runs go beyond Sangotedo, which they always pass. Empty is
   *  Sangotedo only, and a restaurant anywhere else cannot be ordered onto
   *  them. */
  areas: string;
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
/**
 * The week as it is stored, or null when the database cannot answer at all.
 *
 * An empty list is a real answer: it means no day is scheduled and no run is
 * opened. Null means the table is not there, which is a different thing.
 */
async function storedSchedule(includeHidden: boolean): Promise<ScheduledRun[] | null> {
  try {
    let query = db().from("run_schedule").select("*").order("weekday").order("cut_off");
    if (!includeHidden) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Postgres hands back "11:30:00"; the time input and the parser want "11:30".
    const clock = (raw: string | null | undefined) => (raw ?? "").slice(0, 5);
    return ((data ?? []) as ScheduledRun[]).map((row) => ({
      ...row,
      cut_off: clock(row.cut_off),
      areas: row.areas ?? "",
      window_from: clock(row.window_from),
      window_to: clock(row.window_to),
    }));
  } catch {
    return null;
  }
}

/**
 * The week as the admin has set it. Which days run, when ordering closes on
 * each, and when each lands.
 *
 * The fallback below is for a database that has not got the table yet, so a
 * fresh one still opens its Friday runs. It deliberately does not cover an
 * empty table: rows invented in code cannot be edited or removed, and a week
 * somebody has just cleared should stay cleared rather than growing Friday
 * back with a Remove button that does nothing.
 */
export async function runSchedule(includeHidden = false): Promise<ScheduledRun[]> {
  const rows = await storedSchedule(includeHidden);
  if (rows !== null) return rows;

  return RUN_WEEKDAYS.flatMap((weekday) =>
    (["afternoon", "night"] as BatchSlot[]).map((slot) => ({
      id: `${weekday}-${slot}`,
      weekday,
      slot,
      cut_off: `${String(CUT_OFFS[slot].hour).padStart(2, "0")}:${String(
        CUT_OFFS[slot].minute
      ).padStart(2, "0")}`,
      window_from: "",
      window_to: "",
      window_text: DELIVERY_WINDOWS[slot],
      areas: "",
      active: true,
    }))
  );
}
