import { db } from "./supabase";
import { DELIVERY_LEAD_HOURS } from "./fees";
import { NOT_ORDERS_SQL } from "./orders";
import { closedDates } from "./closures";
import { emptyRunClosesAt, windowAfterHolding } from "./run-window";
import { deliveryWindows, safeSettings } from "./settings";
import { runSchedule } from "./schedule";
import { RUN_HORIZON_DAYS, TZ } from "./config";
import { lagosInstant, lagosToday } from "./time";
import { stageIndex } from "./stages";
import {
  anythingLeft,
  PAY_WITHIN_MINUTES,
  stillToGo,
  takingLastMinute,
  windowGone,
} from "./last-minute";
import { windowHours } from "./same-day";
import { gotList } from "./runner";
import {
  carsStillDrivable,
  driverIsOut,
  OUT_STAGES,
  type DrivingNow,
} from "./one-driver";
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
  // A run nobody ordered on closes its own books, rather than waiting in
  // the board for somebody to settle a night that never happened.
  await settleEmptyRuns();
}

/**
 * Dates and slots the opener passes over, because the run there was deleted
 * on purpose.
 *
 * Tolerant of a database without the table: no skips is the right answer for
 * one, and this runs on the path that opens the week, which must never be
 * able to fail for the sake of a list of exceptions.
 */
export async function skippedRuns(from: string, to: string): Promise<Set<string>> {
  const { data, error } = await db()
    .from("run_skips")
    .select("run_date, slot")
    .gte("run_date", from)
    .lte("run_date", to);
  if (error) return new Set();
  return new Set(
    ((data ?? []) as { run_date: string; slot: string }[]).map(
      (row) => `${row.run_date}|${row.slot}`
    )
  );
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

  // Never behind today. Opening "the rest of September" hands this the whole
  // month, and a run opened for last Tuesday is a run nobody can use sitting
  // in the list above the ones they can.
  const start = from < lagosToday() ? lagosToday() : from;

  for (let date = start; date <= to; date = addDays(date, 1)) {
    const weekday = weekdayOf(date);
    for (const run of schedule.filter((entry) => entry.weekday === weekday)) {
      const [hour, minute] = run.cut_off.split(":").map(Number);
      rows.push({
        run_date: date,
        slot: run.slot,
        cut_off_at: lagosInstant(date, hour, minute),
        delivery_window_text: run.window_text || windows[run.slot],
        // Where this weekday's runs go. Said once on the schedule rather
        // than ticked on every run after it opens, which is how a Saturday
        // that was always going to Lekki opened not going there.
        areas: run.areas ?? "",
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

  // What is already there, counting runs and nothing else. A same day car and
  // a skincare drop both borrow a run's date and slot, so a Saturday with a
  // drop on it looked like a Saturday that already had its run: pressing open
  // did nothing, every time, and the only thing on the day was the drop.
  //
  // Falls back to counting everything when the database has not got `kind`
  // yet, for the same reason every other read of it does.
  const askExisting = (byKind: boolean) => {
    const query = db()
      .from("batches")
      .select("run_date, slot")
      .gte("run_date", from)
      .lte("run_date", to);
    return byKind ? query.eq("kind", "run") : query;
  };
  let existing = await askExisting(true);
  if (existing.error) existing = await askExisting(false);

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
  // Days deliberately taken off. Deleting an empty run used to be a fight
  // nobody could win: this function opens every run the week calls for, so a
  // deleted Friday was back within the minute. A skip is how "I do not want
  // that one" survives the next page load.
  const skipped = await skippedRuns(from, to);
  // Whole days off, which a skip cannot say. A skip is one date and one
  // slot, so a week away was ten of them typed by hand and a new slot added
  // to the week filled the holes back in. A closure is the range said once,
  // it covers every slot in it, and opening a month deliberately leaves it
  // alone rather than clearing it: a month is opened because the week
  // changed, not because the break is cancelled.
  const shut = await closedDates(from, to);
  const missing = rows.filter(
    (row) =>
      !already.has(`${row.run_date}|${row.slot}`) &&
      !skipped.has(`${row.run_date}|${row.slot}`) &&
      !shut.has(row.run_date)
  );
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
  const now = new Date();

  // Read first rather than closing in one statement, because an empty run
  // is not closed at all now and whether it is empty is a second question
  // the update cannot ask.
  /*
   * Runs only. A car of its own is never swept.
   *
   * A same day car and a parcel trip are one customer's journey, made the
   * moment they ask for it, and both are created with their cut-off set to
   * that moment: there is no window for anybody else to join, so there is
   * nothing for a cut-off to hold open. Which made every one of them
   * already expired the second it existed, and this sweep shut it within
   * the minute: ordered, car opened, car closed, all before the food was
   * bought. On those two it is the stage that says where the trip has got
   * to, never the status.
   *
   * Asked in a way that survives a database without the column, because
   * this runs on the home page and must never be the thing that takes the
   * shop down. Before the column exists every batch is a run anyway.
   */
  const ask = (byKind: boolean) => {
    const query = db()
      .from("batches")
      .select("*")
      .eq("status", "open")
      .lt("cut_off_at", now.toISOString());
    return byKind ? query.not("kind", "in", '("same_day","parcel")') : query;
  };

  let { data: due, error: wrong } = await ask(true);
  if (wrong) ({ data: due } = await ask(false));

  const { settleGroupFees } = await import("./groups");
  // Read once rather than per run: a sweep usually has one or two runs on
  // it and the area list is the same answer for all of them.
  const { allAreas } = await import("./areas-server");
  const { runLastHour } = await import("./settings");
  const any = (due ?? []).length > 0;
  const areas = any ? await allAreas().catch(() => []) : [];
  const lastHour = any ? await runLastHour().catch(() => 19) : 19;

  for (const batch of (due ?? []) as Batch[]) {
    // A run with nothing on it has nothing to collect, so its cut-off is
    // not protecting anything: it is only turning away the person who was
    // going to order at two. Held open instead, to three hours before the
    // last delivery, which is the point where there is no longer time to
    // go and fetch the food.
    //
    // The cut-off on the row is moved rather than the closing being
    // skipped, so every other thing that asks whether a run is open, and
    // there are a dozen, keeps reading one column and needs no telling
    // about any of this.
    //
    // It cannot run away with itself: once the new cut-off passes, the
    // same sum gives a time in the past, and the run closes as it always
    // would have.
    const held = (await isEmptyRun(batch))
      ? emptyRunClosesAt(batch, now, areas, lastHour)
      : null;

    if (held !== null) {
      // The window goes with it. The one admin wrote was built around a
      // cut-off that no longer applies, and a delivery promised before
      // ordering has even shut is read as a time we did not bother to keep.
      await db()
        .from("batches")
        .update({
          cut_off_at: held,
          delivery_window_text: windowAfterHolding(held, lastHour),
        })
        .eq("id", batch.id);
      continue;
    }

    const { data: shut } = await db()
      .from("batches")
      .update({
        status: "closed",
        stage: "closed",
        stage_updated_at: now.toISOString(),
      })
      .eq("id", batch.id)
      // Still open: anything that moved underneath us is somebody else's
      // to finish.
      .eq("status", "open")
      .select("*")
      .maybeSingle();

    if (shut) await settleGroupFees(shut as Batch);
  }
}

/**
 * Whether a run has anything on it worth going out for.
 *
 * An order somebody cancelled leaves the car as empty as it was before
 * they placed it, so it does not hold the cut-off where it is.
 */
async function isEmptyRun(batch: Batch): Promise<boolean> {
  const { count, error } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batch.id)
    .not("status", "in", "(cancelled,refunded)");

  // Not knowing means closing, which is what it did before any of this.
  if (error) return false;
  return (count ?? 0) === 0;
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
    // A parcel's trip is made for one order too, and a parcel whose order
    // never saved leaves the same thing behind: a trip for nothing, sitting
    // in the week saying its day has not been agreed. Both are cleared the
    // same way, because both are only ever a container for one order.
    const { data: cars } = await db()
      .from("batches")
      .select("id")
      .in("kind", ["same_day", "parcel"])
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

/**
 * Whether a run that nobody ordered on can close its own books.
 *
 * A scheduled run opens itself every week whether or not anybody wants it,
 * and the quiet ones used to sit in the board for ever: past, closed, with
 * no orders, no costs and nothing to do, counted among the jobs still open
 * because nothing had ever said otherwise. Somebody then had to go and
 * settle a run that never happened, which is a chore invented entirely by
 * the software.
 *
 * Settled rather than deleted, which is the difference between this and a
 * same day car. A same day car is a container for one order and is worth
 * nothing without it. A scheduled run is a date the shop offered: deleting
 * it loses the fact that Tuesday was offered and nobody wanted it, which is
 * the single most useful thing an empty run has to say.
 *
 * Only with nothing on it at all. One unpaid order is somebody who may
 * still pay, and settling over their head would close the books on a run
 * that is about to take money.
 */
export function emptyAndDone(
  batch: Pick<Batch, "kind" | "settled_at" | "cut_off_at">,
  orders: number,
  now: number = Date.now()
): boolean {
  if (batch.settled_at !== null) return false;
  if (orders > 0) return false;

  // Same day cars and parcels are deleted when they are empty, not
  // settled, and the skincare drop and box days keep their own books.
  if (batch.kind !== "run") return false;

  const closed = new Date(batch.cut_off_at).getTime();
  if (!Number.isFinite(closed)) return false;
  return closed <= now;
}

/**
 * Close the books on every run that closed with nothing on it.
 *
 * Runs on the same sweep that opens the week and shuts expired runs, so a
 * quiet Tuesday tidies itself up without anybody opening it. Never worth a
 * page that will not load, which is why the whole thing is wrapped.
 */
export async function settleEmptyRuns(): Promise<number> {
  try {
    const { data: quiet } = await db()
      .from("batches")
      .select("id, kind, settled_at, cut_off_at")
      .eq("kind", "run")
      .is("settled_at", null)
      .lt("cut_off_at", new Date().toISOString())
      .limit(200);

    const rows = (quiet ?? []) as {
      id: string;
      kind: Batch["kind"];
      settled_at: string | null;
      cut_off_at: string;
    }[];
    if (rows.length === 0) return 0;

    const { data: used } = await db()
      .from("orders")
      .select("batch_id")
      .in(
        "batch_id",
        rows.map((row) => row.id)
      );
    const busy = new Set((used ?? []).map((row) => row.batch_id as string));

    const dead = rows
      .filter((row) => emptyAndDone(row, busy.has(row.id) ? 1 : 0))
      .map((row) => row.id);
    if (dead.length === 0) return 0;

    const { error } = await db()
      .from("batches")
      .update({ settled_at: new Date().toISOString(), status: "closed" })
      .in("id", dead);
    return error ? 0 : dead.length;
  } catch {
    return 0;
  }
}

export type OpenBatch = Batch & {
  order_count: number;
  full: boolean;
  /** A run that has closed but has not been shopped yet, still taking
   *  orders from the counters it has not been to. See lib/last-minute.ts. */
  lastMinute?: boolean;
};

/**
 * The times on offer, with the ones nobody is left to drive taken out.
 *
 * The setting says whether the shop does cars of their own at all. This
 * says which of today's times the one driver is free for, which is a
 * different question and the one that goes wrong: the run closes in the
 * afternoon and is driven in the evening, and the car was still on sale
 * the whole time she was out with the boot full. Tomorrow is untouched,
 * because tomorrow was never the thing that clashed. See
 * `lib/one-driver.ts`.
 *
 * Asked for defensively, because every customer-facing page calls it: a
 * query that fails answers "nobody is out", which is how the shop worked
 * before this existed.
 */
export async function carsOnOffer<T extends { date: string }>(
  slots: T[]
): Promise<T[]> {
  if (slots.length === 0) return slots;

  // A day a run goes is not a day a car of its own can go: it is one
  // driver and one trip to the market, and the car would be a dearer
  // version of the drive she is already making.
  const runs = await daysWithARun([...new Set(slots.map((one) => one.date))]);
  const left = slots.filter((one) => !runs.has(one.date));

  // And today goes altogether while she is out with the boot full.
  return carsStillDrivable(left, await someoneIsDriving(), lagosToday());
}

/** Whether a time is one the shop will not sell a car for. */
export async function nobodyToDrive(date: string): Promise<boolean> {
  if ((await daysWithARun([date])).has(date)) return true;
  if (date !== lagosToday()) return false;
  return someoneIsDriving();
}

/** Whether a run is going on a day, for anything that asks about one. */
export async function runGoingOn(date: string): Promise<boolean> {
  return (await daysWithARun([date])).has(date);
}

/** Today, for the pages that only ever ask about today. */
export async function runGoingToday(): Promise<boolean> {
  return runGoingOn(lagosToday());
}

/**
 * The days in this list that already have a run going.
 *
 * A run counts whatever state it is in, short of cancelled. Today's that
 * has closed is still going, because as far as somebody ordering is
 * concerned it takes the order and arrives this evening; and one that
 * has been and come back still used up the day's driving.
 *
 * Asked for defensively, because every customer-facing page calls it: a
 * query that fails answers "no runs", which is how the shop worked
 * before this existed.
 */
export async function daysWithARun(dates: string[]): Promise<Set<string>> {
  const wanted = [...new Set(dates.filter((one) => one !== ""))];
  if (wanted.length === 0) return new Set();
  try {
    const { data, error } = await db()
      .from("batches")
      .select("kind, run_date, status")
      .in("run_date", wanted)
      .neq("status", "cancelled");
    if (error) return new Set();

    return new Set(
      ((data ?? []) as Batch[])
        .filter((one) => (one.kind ?? "run") === "run")
        .map((one) => one.run_date)
    );
  } catch {
    return new Set();
  }
}

/** The run being driven right now, if there is one. */
export async function someoneIsDriving(): Promise<boolean> {
  try {
    const today = lagosToday();
    const { data, error } = await db()
      .from("batches")
      .select("kind, stage, run_date, status")
      .eq("run_date", today)
      .in("stage", [...OUT_STAGES])
      .limit(20);
    if (error) return false;
    return driverIsOut((data ?? []) as DrivingNow[], today);
  } catch {
    return false;
  }
}

/**
 * The counters a late order on this run may still draw on.
 *
 * Everything it was willing to stop at, less everything it has been to.
 * Null where the shop cannot be asked, which reads as "do not take a late
 * order" rather than as "take it from anywhere".
 */
export async function countersStillAhead(batch: Batch): Promise<string | null> {
  try {
    const { data, error } = await db()
      .from("restaurants")
      .select("id, name")
      .eq("active", true);
    if (error) return null;
    return stillToGo({
      onlyPlaces: batch.only_places,
      everyPlace: (data ?? []) as { id: string; name: string }[],
      got: gotList(batch.runner_got),
    });
  } catch {
    return null;
  }
}

/**
 * The run that has closed but has not been shopped yet, if there is one.
 *
 * This is the last minute window: the car has not gone, the food has not
 * been bought, and a counter she has not ticked off is a counter she is
 * still going to stand at. See `lib/last-minute.ts` for the rule.
 *
 * It comes back shaped like any other open batch, with `only_places`
 * narrowed to the counters still ahead, so every check that keeps a cart
 * off the wrong run keeps it off the counters she has already left
 * without knowing this exists.
 *
 * Asked for defensively: the home page and the checkout both call it, and
 * a query that fails answers "there is not one", which is how the shop
 * worked before this existed.
 */
export async function lastMinuteRun(): Promise<OpenBatch | null> {
  try {
    const { data, error } = await db()
      .from("batches")
      .select("*")
      .eq("run_date", lagosToday())
      .in("stage", ["closed", "at_counter"])
      .neq("status", "cancelled")
      .order("cut_off_at", { ascending: true })
      .limit(4);
    if (error) return null;

    // The stage says where the car is, and the stage is a tap somebody
    // has to remember. The clock is not: past the end of its window the
    // run is home, whatever anybody pressed. See lib/last-minute.ts.
    const hourNow = hourInLagos();
    const today = lagosToday();

    const run = ((data ?? []) as Batch[]).find(
      (one) =>
        takingLastMinute(one) &&
        !windowGone({
          hours: windowHours(one.delivery_window_text ?? ""),
          hourNow,
          runDate: one.run_date,
          today,
        })
    );
    if (!run) return null;

    const left = await countersStillAhead(run);
    if (left === null || !anythingLeft(left)) return null;

    const counts = await orderCounts([run.id]);
    return {
      ...run,
      only_places: left,
      /*
       * The deadline this order actually has.
       *
       * The stored one went hours ago and every clock on the site reads
       * it: a countdown to a time in the past is the shop saying the run
       * is gone on the one screen offering it. What is true instead is
       * that she is about to stand at the counter, so the deadline is a
       * few minutes from whenever somebody is looking. The row itself is
       * untouched: this is what the pages are handed, never what is
       * written back.
       */
      cut_off_at: new Date(Date.now() + PAY_WITHIN_MINUTES * 60_000).toISOString(),
      order_count: counts.get(run.id) ?? 0,
      // A run already shopping is past the point where a capacity cap
      // means anything: the question is whether the counter is still
      // ahead, and that is what `only_places` now answers.
      full: false,
      lastMinute: true,
    };
  } catch {
    return null;
  }
}

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

  const open = batches.map((b) => {
    const order_count = counts.get(b.id) ?? 0;
    return { ...b, order_count, full: b.capacity !== null && order_count >= b.capacity };
  });

  /*
   * Tonight's closed run, while the food is still to be bought.
   *
   * First in the list, because it is the soonest thing going by hours and
   * because it is the one with a clock on it. It is here rather than in
   * each page so that every way into the shop offers it the same: the
   * home page, the cart, a counter's own page, the app and the chat.
   */
  const late = await lastMinuteRun();
  if (!late || open.some((one) => one.id === late.id)) return open;
  return [late, ...open];
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
  if (batch.status === "open" && new Date(batch.cut_off_at).getTime() > Date.now()) {
    return true;
  }
  // Closed is not the same as gone. Until the food is bought there is a
  // car going, and a counter it has not reached is one it can still buy
  // at. Past the hour it was going to arrive it is gone whatever the
  // stage says, because the stage is a tap somebody has to remember and
  // the clock is not. See lib/last-minute.ts.
  if (!takingLastMinute(batch)) return false;
  return !windowGone({
    hours: windowHours(batch.delivery_window_text ?? ""),
    hourNow: hourInLagos(),
    runDate: batch.run_date,
    today: lagosToday(),
  });
}

/** The hour of the day where the shop is. */
function hourInLagos(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
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
      /*
       * Three hours before it lands, which is the real deadline.
       *
       * This was the moment the car was made, on the reasoning that a car
       * of its own is nobody else's to join so a cut-off protects nothing.
       * But the sheet reads it: a car booked at seven in the morning for
       * four in the afternoon showed "orders close 07:14", which says the
       * thing shut before it existed and is no help to anybody looking at
       * the run.
       *
       * Three hours is the same number the shop promises on a car of its
       * own, and the same one an empty run is held open to: the point
       * where there is no longer time to go and fetch the food. Never
       * before now, so a car booked for two hours' time does not get a
       * deadline in the past.
       */
      cut_off_at: new Date(
        Math.max(Date.now(), at.getTime() - DELIVERY_LEAD_HOURS * 3_600_000)
      ).toISOString(),
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

/**
 * Cars of their own that are still going out.
 *
 * A car of its own is one person's trip at a time they chose, so it is
 * nobody else's to join and never appears in the list a customer picks
 * from. That rule is right for a customer and wrong for the shop: an
 * order comes in at half past eleven, there is already a car going at
 * half past two, and the sensible thing is to put the food in the car
 * that is going. The move list offered six new windows and every run this
 * week, and not the one trip the driver is actually making.
 *
 * Not through openBatches, which is the customer's list and filters these
 * out on purpose. Admin asks for them by name.
 *
 * Anything already handed out is left off: a car that has been and come
 * back is not a car to put food in.
 */
export async function carsStillGoing(): Promise<Batch[]> {
  try {
    const { data, error } = await db()
      .from("batches")
      .select("*")
      .eq("kind", "same_day")
      .gte("run_date", lagosToday())
      .neq("stage", "handed_out")
      .order("deliver_at", { ascending: true })
      .limit(20);
    // Before the column exists there are no cars of their own at all, and
    // the move list is what it has always been.
    if (error) return [];
    return (data ?? []) as Batch[];
  } catch {
    return [];
  }
}
