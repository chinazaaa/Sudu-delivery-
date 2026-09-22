import { db } from "./supabase";
import { NOT_ORDERS_SQL } from "./orders";
import { deliveryWindows, safeSettings } from "./settings";
import { runSchedule } from "./schedule";
import { RUN_HORIZON_DAYS, TZ } from "./config";
import { lagosInstant, lagosToday } from "./time";
import { stageIndex } from "./stages";
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
 * The housekeeping that used to run on every page view.
 *
 * Opening three weeks of runs and closing whatever has expired are both
 * writes, and they sat at the top of the one function the home page, the
 * cart, the checkout and every box page all call. Four trips to a database
 * in London before a single thing could be drawn, on every tap, and that is
 * most of why the site felt slow.
 *
 * Nothing about them needs doing more than once a minute. A run that the
 * schedule calls for is not more open for having been checked twice in the
 * same second, and a cut-off that passed is still passed sixty seconds
 * later: the query that reads the runs excludes an expired one anyway, so
 * nobody is offered a car that has gone.
 *
 * The clock is per server, which means a cold start does the work again.
 * That is the right way round: it is warm instances, the ones serving
 * somebody tapping through the shop, that skip it.
 */
const TEND_EVERY = 60_000;
let tendedAt = 0;

export async function tendBatches(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - tendedAt < TEND_EVERY) return;
  tendedAt = now;

  await ensureUpcomingBatches();
  await closeExpiredBatches();
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
  // transport_cost is left out rather than sent as a zero: the column has a
  // default, and naming a column the database has not been given yet would
  // fail the whole insert and open no runs at all.
  const rows: Array<Omit<Batch, "id" | "transport_cost" | "settled_at">> = [];

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
        food_spend: 0,
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

/**
 * The groups on a car that never became anything, cleared out of the way.
 *
 * Starting a group picks a time, and picking a time makes the car there and
 * then, because the people joining have to be told when their food comes.
 * Most of those groups are never finished: somebody tries it, or sends a link
 * nobody opens. The group row stays, and because a car cannot be deleted
 * while a group points at it, so does the car. That is what filled the runs
 * list with empty closed cars that refused to delete.
 *
 * Only groups with no orders on them go: a group that closed into real orders
 * is history, and history is not tidying.
 */
export async function clearDeadGroups(batchId: string): Promise<void> {
  const { data: groups } = await db()
    .from("order_groups")
    .select("id")
    .eq("batch_id", batchId);

  const ids = (groups ?? []).map((row) => row.id as string);
  if (ids.length === 0) return;

  const { data: used } = await db()
    .from("orders")
    .select("group_id")
    .in("group_id", ids);
  const keep = new Set((used ?? []).map((row) => row.group_id as string));

  const dead = ids.filter((id) => !keep.has(id));
  // The seats inside them go with them: group_carts cascades on this delete.
  if (dead.length > 0) await db().from("order_groups").delete().in("id", dead);
}

/**
 * Empty same day cars nobody is in any more, removed.
 *
 * A car with an order on it is never touched, and neither is one whose group
 * is still open, which is somebody's link out in a chat right now. What is
 * left is the residue of a group that was abandoned, and there is nothing in
 * it to lose.
 */
export async function tidyEmptySameDay(): Promise<number> {
  try {
    const { data: cars } = await db()
      .from("batches")
      .select("id")
      .eq("kind", "same_day")
      .limit(200);

    const ids = (cars ?? []).map((row) => row.id as string);
    if (ids.length === 0) return 0;

    const { data: used } = await db().from("orders").select("batch_id").in("batch_id", ids);
    const busy = new Set((used ?? []).map((row) => row.batch_id as string));

    // A group still taking people is a car somebody is counting on. A group
    // with no closing time on it counts as one too: the clock starts at the
    // first order, so no time means nobody has ordered yet, not that nobody
    // is there.
    const now = Date.now();
    const { data: live } = await db()
      .from("order_groups")
      .select("batch_id, closes_at")
      .in("batch_id", ids)
      .is("closed_at", null);
    for (const row of live ?? []) {
      const closes = row.closes_at as string | null;
      if (!closes || new Date(closes).getTime() > now) busy.add(row.batch_id as string);
    }

    const dead = ids.filter((id) => !busy.has(id));
    if (dead.length === 0) return 0;

    for (const id of dead) await clearDeadGroups(id);
    await db().from("carts").delete().in("batch_id", dead);
    const { error } = await db().from("batches").delete().in("id", dead);
    return error ? 0 : dead.length;
  } catch {
    // Tidying is never worth a page that will not load.
    return 0;
  }
}

export type OpenBatch = Batch & { order_count: number; full: boolean };

/**
 * Every batch still taking orders, soonest cut-off first. This is what makes
 * the site roll forward instead of dead-ending: a student arriving after the
 * night cut-off is shown tomorrow, not a closed sign.
 */
export async function openBatches(days?: number): Promise<OpenBatch[]> {
  await tendBatches();

  // Runs exist three weeks out so they can be planned, but a customer is only
  // offered the near ones: food is not planned a fortnight ahead, and an order
  // that sits unpaid that long is priced on a menu that has since moved.
  //
  // A box is the exception and says so by asking for its own number of days.
  // A games night really is planned a fortnight out, and the menu-drift worry
  // does not apply to it because a box is priced off the menu at the moment
  // somebody orders.
  const horizon = days ?? ((await safeSettings()).order_horizon_days || 7);
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
      .limit(days ? 40 : 8);
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
    .not("status", "in", NOT_ORDERS_SQL);
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
/**
 * Whether an order on this run can still be paid for.
 *
 * Not the same as being orderable. A run stops taking new orders at its cut
 * off, and a group's clock is allowed to end on that cut off, so every order
 * a group makes is written moments after the run stopped taking new ones.
 * Those orders are real and have to be paid for. What ends payment is the
 * shopping: once the food is being bought, money arriving late has to go
 * back.
 */
export function takesMoney(batch: Batch): boolean {
  if (batch.status === "cancelled" || batch.status === "delivered") return false;
  if (stageIndex(batch.stage) >= stageIndex("at_counter")) return false;
  // A run nobody ever moved on. Its day has been and gone.
  return batch.run_date >= lagosToday();
}

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

  /*
   * One car, not one per order.
   *
   * Every same day order used to make its own batch, so two people asking
   * for half past twelve made two cars on the run sheet for one trip
   * somebody was going to drive once. Three of them today.
   *
   * A car of its own is still a car of its own as far as the price goes:
   * each of those orders pays the same day fee, because each of them asked
   * for a trip at a time nobody else had picked. What is shared is the
   * driving, and the sheet should say what is driven.
   *
   * Only one still being shopped for. Past that the food has been bought
   * and the car has gone, so a later order is genuinely a second trip. The
   * cut off on these is set to the moment they are made, so the status is
   * no use as a gate; the stage is what says where the car has got to.
   */
  const { data: already } = await db()
    .from("batches")
    .select("*")
    .eq("kind", "same_day")
    .eq("deliver_at", args.deliverAt)
    .in("stage", ["ordering", "closed"])
    .neq("status", "cancelled")
    // Batches have no created_at, so the cut off is what orders them. On a
    // same day car it is the moment the car was made, which is the same
    // thing said another way.
    .order("cut_off_at", { ascending: true })
    .limit(1);

  const sharing = (already ?? [])[0] as Batch | undefined;
  if (sharing) return sharing;

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
