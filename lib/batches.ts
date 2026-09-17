import { db } from "./supabase";
import { deliveryWindows, safeSettings } from "./settings";
import { runSchedule } from "./schedule";
import { RUN_HORIZON_DAYS, TZ } from "./config";
import { lagosInstant, lagosToday } from "./time";
import type { Batch } from "./types";

/** Weekday number (0 = Sunday) of a YYYY-MM-DD date, read in Lagos. */
function weekdayOf(date: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" })
    .format(new Date(date + "T12:00:00Z"));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Opens the batches for every upcoming run day, so nobody has to remember to
 * do it. Existing rows are left alone, so a cancelled batch stays cancelled.
 */
export async function ensureUpcomingBatches(): Promise<void> {
  const today = lagosToday();
  await openRunsBetween(today, addDays(today, RUN_HORIZON_DAYS - 1));
}

/**
 * Opens every run the schedule calls for between two dates, inclusive. Runs
 * that already exist are left exactly as they are, so a cancelled run stays
 * cancelled and a run with orders on it is never rewritten.
 *
 * Returns how many were opened, so a month can report what it did.
 */
export async function openRunsBetween(from: string, to: string): Promise<number> {
  // The week as the admin has set it: which days run, when each closes, and
  // what customers are told about when it lands.
  const schedule = await runSchedule();
  const windows = await deliveryWindows();
  const rows: Array<Omit<Batch, "id">> = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = weekdayOf(date);
    for (const run of schedule.filter((entry) => entry.weekday === weekday)) {
      const [hour, minute] = run.cut_off.split(":").map(Number);
      rows.push({
        run_date: date,
        slot: run.slot,
        cut_off_at: lagosInstant(date, hour, minute),
        delivery_window_text: run.window_text || windows[run.slot],
        status: "open",
        capacity: null,
        flash_fee: null,
        flash_fee_reason: "",
        stage: "ordering",
        stage_updated_at: new Date().toISOString(),
        fuel_cost: 0,
        driver_cost: 0,
        other_cost: 0,
        cost_note: "",
      });
    }
  }
  if (rows.length === 0) return 0;

  const existing = await db()
    .from("batches")
    .select("run_date, slot")
    .gte("run_date", from)
    .lte("run_date", to);
  const already = new Set(
    (existing.data ?? []).map((row) => `${row.run_date}|${row.slot}`)
  );

  const { error } = await db().from("batches").upsert(rows, {
    onConflict: "run_date,slot",
    ignoreDuplicates: true,
  });
  // A blocked write here is why batches would otherwise just never appear.
  if (error) throw new Error(`Could not open batches: ${error.message}`);

  return rows.filter((row) => !already.has(`${row.run_date}|${row.slot}`)).length;
}

/** The last day anything is open for, so admin can see how far ahead it runs. */
export async function openUntil(): Promise<string | null> {
  const { data } = await db()
    .from("batches")
    .select("run_date")
    .eq("status", "open")
    .gte("run_date", lagosToday())
    .order("run_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.run_date as string) ?? null;
}

/**
 * Marks any batch whose cut-off has passed as closed, and settles the fee on
 * every split group in it. That is the moment unpaid shares stop travelling.
 */
export async function closeExpiredBatches(): Promise<void> {
  const { data } = await db()
    .from("batches")
    .update({ status: "closed", stage: "closed", stage_updated_at: new Date().toISOString() })
    .eq("status", "open")
    .lt("cut_off_at", new Date().toISOString())
    .select("*");

  const { settleGroupFees } = await import("./groups");
  for (const batch of (data ?? []) as Batch[]) {
    await settleGroupFees(batch);
  }
}

export type OpenBatch = Batch & { order_count: number; full: boolean };

/**
 * Every batch still taking orders, soonest cut-off first. This is what makes
 * the site roll forward instead of dead-ending: a student arriving after the
 * night cut-off is shown tomorrow, not a closed sign.
 */
export async function openBatches(): Promise<OpenBatch[]> {
  await ensureUpcomingBatches();
  await closeExpiredBatches();

  // Runs exist three weeks out so they can be planned, but a customer is only
  // offered the near ones: food is not planned a fortnight ahead, and an order
  // that sits unpaid that long is priced on a menu that has since moved.
  const horizon = (await safeSettings()).order_horizon_days || 7;
  const until = new Date(Date.now() + horizon * 86400000).toISOString();

  const { data, error } = await db()
    .from("batches")
    .select("*")
    .eq("status", "open")
    .gt("cut_off_at", new Date().toISOString())
    .lt("cut_off_at", until)
    .order("cut_off_at", { ascending: true })
    .limit(8);
  if (error) throw new Error(error.message);

  const batches = (data ?? []) as Batch[];
  const counts = await orderCounts(batches.map((b) => b.id));

  return batches.map((b) => {
    const order_count = counts.get(b.id) ?? 0;
    return { ...b, order_count, full: b.capacity !== null && order_count >= b.capacity };
  });
}

/** Paid + pending order counts per batch. Used only for real capacity caps. */
export async function orderCounts(batchIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (batchIds.length === 0) return counts;

  const { data, error } = await db()
    .from("orders")
    .select("batch_id")
    .in("batch_id", batchIds)
    .neq("status", "refunded");
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    counts.set(row.batch_id, (counts.get(row.batch_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * The batch that just closed, if one did today. It is shown struck through in
 * the selector so a student who arrives late sees what they missed and which
 * batch they are being moved to, rather than the list silently changing.
 */
export async function recentlyClosedBatch(): Promise<Batch | null> {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const { data } = await db()
    .from("batches")
    .select("*")
    .in("status", ["closed", "delivered"])
    .gt("cut_off_at", twelveHoursAgo)
    .lt("cut_off_at", new Date().toISOString())
    .order("cut_off_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Batch) ?? null;
}

export async function getBatch(id: string): Promise<Batch | null> {
  const { data } = await db().from("batches").select("*").eq("id", id).maybeSingle();
  return (data as Batch) ?? null;
}

/** A batch takes orders only while it is open, uncancelled and pre-cut-off. */
export function isOrderable(batch: Batch): boolean {
  return batch.status === "open" && new Date(batch.cut_off_at).getTime() > Date.now();
}
