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
        kind: "run",
        deliver_at: null,
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

  // Only the ones that are not there yet, chosen here rather than left to
  // ON CONFLICT.
  //
  // This used to upsert on (run_date, slot) and let the database sort it out,
  // which tied every page load of the shop to that pair being unique across
  // every batch. It cannot be: a same day car is a batch too, and it borrows a
  // run's date and slot because the enum only knows the two. Asking the
  // database to infer a conflict it can no longer infer took the shop down, so
  // the decision is made here, where it can be read.
  const missing = rows.filter((row) => !already.has(`${row.run_date}|${row.slot}`));
  if (missing.length === 0) return 0;

  const strip = (list: typeof rows) =>
    list.map(({ kind, deliver_at, ...rest }) => {
      void kind;
      void deliver_at;
      return rest;
    });

  // Written without the newer columns when the database has not got them yet,
  // for the same reason the read above is: this runs on every page load of the
  // shop, and a migration that has not been run must not close it.
  const write = async (list: typeof rows) => {
    let { error } = await db().from("batches").insert(list);
    if (error) ({ error } = await db().from("batches").insert(strip(list)));
    return error;
  };

  // Two page loads landing together both see the same run missing and both
  // try to make it. One wins; the other is told it is a duplicate, which is
  // the right answer and not a failure. A whole insert fails on one duplicate
  // row though, so that case is retried one at a time rather than losing the
  // rest of the week.
  const duplicate = (error: { code?: string } | null) => error?.code === "23505";

  const error = await write(missing);
  if (error && duplicate(error)) {
    for (const row of missing) {
      const one = await write([row]);
      if (one && !duplicate(one)) {
        throw new Error(`Could not open batches: ${one.message}`);
      }
    }
    return missing.length;
  }

  // A blocked write here is why batches would otherwise just never appear.
  if (error) throw new Error(`Could not open batches: ${error.message}`);

  return missing.length;
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
  // Whole days, to the end of the last one. Counting in hours from right now
  // put next Friday's 11:30 cut-off a few hours outside a seven-day window, so
  // on a Friday the only run anybody could see was that same night's.
  const until = `${addDays(lagosToday(), horizon)}T23:59:59+01:00`;

  // A same day delivery is one person's car at a time they chose. It is a
  // batch so the stages and the run sheet work, but it is nobody else's to
  // join, so it never appears in the list a customer picks from.
  //
  // Asked for in a way that survives a database which has not had the
  // migration run yet. This query is the home page and the checkout: it must
  // never be the thing that takes the shop down, and before the column exists
  // every batch is a run anyway.
  const ask = (filterByKind: boolean) => {
    let query = db()
      .from("batches")
      .select("*")
      .eq("status", "open")
      .gt("cut_off_at", new Date().toISOString())
      .lt("cut_off_at", until)
      .order("cut_off_at", { ascending: true })
      .limit(8);
    if (filterByKind) query = query.eq("kind", "run");
    return query;
  };

  let { data, error } = await ask(true);
  if (error) ({ data, error } = await ask(false));
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

/**
 * A car going out for one order, at the time somebody asked for.
 *
 * It is a batch because everything downstream already understands batches:
 * the stages the customer watches, the run sheet, the profit on a trip. What
 * makes it different is `kind`, which keeps it out of the list customers pick
 * a run from, because this one is not theirs to join.
 *
 * The cut-off is now. There is nothing to wait for: the food is being fetched
 * as soon as it is paid for.
 */
export async function createSameDayBatch(args: {
  deliverAt: string;
  label: string;
}): Promise<Batch | null> {
  const at = new Date(args.deliverAt);

  const { data, error } = await db()
    .from("batches")
    .insert({
      run_date: lagosToday(at),
      // The enum only knows these two, and the real time is on deliver_at.
      // Five is the sensible line between them and nothing reads it for a
      // same day trip anyway.
      slot: at.getUTCHours() >= 16 ? "night" : "afternoon",
      cut_off_at: new Date().toISOString(),
      delivery_window_text: args.label,
      status: "open",
      capacity: null,
      flash_fee: null,
      flash_fee_reason: "",
      stage: "ordering",
      stage_updated_at: new Date().toISOString(),
      kind: "same_day",
      deliver_at: args.deliverAt,
    })
    .select("*")
    .single();

  // Swallowing this is how a unique constraint on (run_date, slot) spent a day
  // telling customers "that batch no longer exists", which was not what had
  // happened and left nothing anywhere to say what had.
  if (error) {
    console.error("createSameDayBatch failed:", error.message);
    return null;
  }

  return (data as Batch) ?? null;
}
