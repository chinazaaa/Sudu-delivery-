import { db } from "./supabase";
import { NOT_ORDERS_SQL } from "./orders";
import { lagosToday } from "./time";

/**
 * Days the shop is deliberately shut, said once as a range.
 *
 * The schedule says what a week looks like and the opener makes every run it
 * calls for, three weeks out, on its own. That is the right default and it is
 * exactly wrong for a mid-semester break: nobody is on campus, and the runs
 * open anyway, every week, however many single runs were deleted by hand.
 *
 * A closure is the answer in the shape of the question. One row covers a
 * stretch of dates and every slot in them, it carries the name a customer
 * reads, the opener passes over it, opening a month leaves it alone, and the
 * shop says what is happening on the way in rather than going quiet.
 *
 * Every read here tolerates a database without the table. The opener runs on
 * the path that draws the shop, and a list of exceptions must never be the
 * reason nothing opens: no closures is the right answer for a database that
 * has not had the migration run on it, because that database has none.
 */
export type Closure = {
  id: string;
  /** What it is called. Shown to customers, so it is never empty on screen:
   *  a closure with no name reads as "No runs" and nothing else. */
  name: string;
  starts_on: string;
  /** Inclusive: a closure that ends on the 30th has no runs on the 30th. */
  ends_on: string;
  /** The shop's own note, never shown to a customer. */
  note: string;
};

function addDays(date: string, days: number): string {
  // Midday UTC, so adding days cannot slip across a midnight.
  const at = new Date(`${date}T12:00:00Z`);
  return new Date(at.getTime() + days * 86400000).toISOString().slice(0, 10);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Every closure that has not finished yet, soonest first. */
export async function closures(): Promise<Closure[]> {
  const { data, error } = await db()
    .from("run_closures")
    .select("id, name, starts_on, ends_on, note")
    .gte("ends_on", lagosToday())
    .order("starts_on", { ascending: true });
  if (error) return [];
  return (data ?? []) as Closure[];
}

/** One closure by its id, for the form that edits it. */
export async function oneClosure(id: string): Promise<Closure | null> {
  const { data, error } = await db()
    .from("run_closures")
    .select("id, name, starts_on, ends_on, note")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return (data as Closure) ?? null;
}

/**
 * Every date inside a closure between two dates, as a set of YYYY-MM-DD.
 *
 * Read by the opener, which asks about three weeks at a time, so the range
 * is small enough to expand day by day and a set is what the caller wants to
 * ask of it.
 */
export async function closedDates(from: string, to: string): Promise<Set<string>> {
  const shut = new Set<string>();
  if (!DATE.test(from) || !DATE.test(to) || to < from) return shut;

  // Anything that overlaps the window, which is not the same as anything
  // inside it: a closure running from last Friday to next Tuesday starts
  // before the window and has to count.
  const { data, error } = await db()
    .from("run_closures")
    .select("starts_on, ends_on")
    .lte("starts_on", to)
    .gte("ends_on", from);
  if (error) return shut;

  return datesIn((data ?? []) as { starts_on: string; ends_on: string }[], from, to);
}

/**
 * The rows a closure query came back with, expanded to the days inside a
 * window and clipped to it.
 *
 * Pure, and its own function, because whether a run opens on a given morning
 * is decided here and has to be provable without a database. The clipping is
 * the part worth proving: a closure that starts before the window or ends
 * after it still takes the days it covers inside it, and nothing outside.
 */
export function datesIn(
  rows: { starts_on: string; ends_on: string }[],
  from: string,
  to: string
): Set<string> {
  const shut = new Set<string>();
  if (!DATE.test(from) || !DATE.test(to) || to < from) return shut;

  for (const one of rows) {
    if (!DATE.test(one.starts_on) || !DATE.test(one.ends_on)) continue;
    const start = one.starts_on > from ? one.starts_on : from;
    const end = one.ends_on < to ? one.ends_on : to;
    for (let date = start; date <= end; date = addDays(date, 1)) shut.add(date);
  }
  return shut;
}

/**
 * The closure worth telling a customer about, or null.
 *
 * One at a time, and only one that is either on now or close enough to
 * matter: a break in December is not news in October, and a line along the
 * top of every page saying so is a line people learn to scroll past before
 * the week it is actually about.
 *
 * `within` is the shop's own order horizon by default, which is the honest
 * line: a closure far enough ahead that nobody can order into it yet does
 * not change what anybody sees today.
 */
export async function closureNotice(within = 7): Promise<Closure | null> {
  const today = lagosToday();
  const soon = addDays(today, Math.max(0, within));

  const { data, error } = await db()
    .from("run_closures")
    .select("id, name, starts_on, ends_on, note")
    .gte("ends_on", today)
    .lte("starts_on", soon)
    .order("starts_on", { ascending: true })
    .limit(1);
  if (error) return null;
  return ((data ?? [])[0] as Closure) ?? null;
}

/**
 * A date range as one phrase: "26 to 30 October", or "30 October" for a day.
 *
 * Written by hand rather than through Intl's range formatter, which is not
 * on every browser this has to render in and would be a different sentence
 * on each of them. The month is said once when both ends share it, and the
 * year only when the range leaves this one.
 */
export function rangeLabel(from: string, to: string, today = lagosToday()): string {
  if (!DATE.test(from) || !DATE.test(to)) return "";
  const at = (date: string) => new Date(`${date}T12:00:00Z`);
  const part = (date: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(at(date));

  const thisYear = today.slice(0, 4);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const year = sameYear && from.slice(0, 4) === thisYear ? undefined : "numeric";

  if (from === to) return part(from, { day: "numeric", month: "long", year });
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${part(from, { day: "numeric" })} to ${part(to, { day: "numeric", month: "long", year })}`;
  }
  return `${part(from, { day: "numeric", month: "long", year: sameYear ? undefined : year })} to ${part(to, { day: "numeric", month: "long", year })}`;
}

/** Whether a closure is on today, as opposed to still ahead. */
export function isOn(closure: Closure, today = lagosToday()): boolean {
  return closure.starts_on <= today && closure.ends_on >= today;
}

/**
 * What the shop says about a closure, in one sentence.
 *
 * On the shop rather than in admin, so the wording is decided once: the
 * strip along the top, the run selector and the empty shop all say the same
 * thing about the same days.
 */
export function closureSaid(closure: Closure, today = lagosToday()): string {
  const when = rangeLabel(closure.starts_on, closure.ends_on, today);
  const named = closure.name.trim();
  const days = isOn(closure, today)
    ? `No runs until ${rangeLabel(closure.ends_on, closure.ends_on, today)}`
    : `No runs ${when}`;
  return named === "" ? days : `${days} · ${named}`;
}

/**
 * How many runs inside a range have orders on them.
 *
 * Asked before a closure is saved and printed beside the one already saved,
 * because a closure deletes the empty runs in its range and leaves the rest:
 * a run with somebody's dinner on it is not housekeeping, and a page that
 * silently left three of them standing would be a page that said the days
 * were off when they were not.
 */
export async function bookedInside(from: string, to: string): Promise<number> {
  if (!DATE.test(from) || !DATE.test(to) || to < from) return 0;

  const ask = (byKind: boolean) => {
    const query = db().from("batches").select("id").gte("run_date", from).lte("run_date", to);
    return byKind ? query.eq("kind", "run") : query;
  };
  let found = await ask(true);
  if (found.error) found = await ask(false);

  const ids = (found.data ?? []).map((one) => one.id as string);
  if (ids.length === 0) return 0;

  const { data, error } = await db()
    .from("orders")
    .select("batch_id")
    .in("batch_id", ids)
    .not("status", "in", NOT_ORDERS_SQL);
  if (error) return 0;
  return new Set((data ?? []).map((one) => one.batch_id as string)).size;
}
