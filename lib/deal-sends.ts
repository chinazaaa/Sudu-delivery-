import { db } from "./supabase";
import { TZ } from "./config";
import { naira } from "./money";

/**
 * A history of the one thing in admin with no undo.
 *
 * Sending a deal notification happened and was then forgotten: the only
 * record was a list in the browser that had sent it, which emptied on a
 * reload. So the two questions whoever is about to send asks first had no
 * answer on the screen. Has this already gone out today, and did the last
 * one do anything.
 *
 * The second question is the whole reason this file exists. A notification
 * is worth sending if orders follow it, and orders following it is a thing
 * the database already knows: orders carry the moment they were placed.
 * Counting them in the hours after a send is not proof that the send caused
 * them, and nothing here says it is. It is the only number on the page
 * worth reading all the same.
 */
export type DealSend = {
  id: string;
  title: string;
  body: string;
  path: string;
  sent: number;
  audience: number;
  sent_at: string;
};

/** A send with what happened in the hours after it. */
export type DealSendOutcome = DealSend & {
  /** Orders placed inside the window, and what they came to. */
  orders: number;
  value: number;
};

/**
 * How long after a send its orders are counted for.
 *
 * Six hours, because that is about one run: somebody taps the notification
 * at eleven, thinks about it, and pays before the cut-off. A day would count
 * every order the shop takes and say nothing; an hour would miss most of the
 * ones the notification is responsible for.
 */
export const AFTER_HOURS = 6;
const WINDOW = AFTER_HOURS * 3_600_000;

const STAMP_DAY = new Intl.DateTimeFormat("en-NG", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const STAMP_CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * "Sat 3 Oct, 11:02am", which is how the board writes a send.
 *
 * The day first because the list is read down: two sends on the same
 * afternoon are told apart by the clock, and two a week apart by the day.
 * The clock is closed up, with no space before the am, because it sits in a
 * line of small print next to a count of phones.
 */
export function sendStamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const clock = STAMP_CLOCK.format(at).replace(/\s/g, "").toLowerCase();
  // "Sat, 3 Oct" is how the locale writes it and one comma in the line is
  // enough: the one that matters separates the day from the clock.
  const day = STAMP_DAY.format(at).replace(",", "");
  return `${day}, ${clock}`;
}

/** Whole days between a moment and now, which is what "N days ago" counts. */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

/**
 * "Last one went 7 days ago", for the card that used to say only that these
 * should be sent sparingly. Sparingly is advice; a date is a fact, and the
 * fact is the thing that stops a second send on the same afternoon.
 *
 * Nothing sent yet, nothing to say, so the card keeps its advice: an empty
 * string is the signal to leave the old sentence alone.
 */
export function lastSentLine(iso: string | null, now: Date = new Date()): string {
  if (iso === null || iso === "") return "";
  const days = daysSince(iso, now);
  if (days === 0) return "Last one went today";
  if (days === 1) return "Last one went yesterday";
  return `Last one went ${days} days ago`;
}

/**
 * Orders placed in the six hours after a send.
 *
 * Pure, and handed the rows, so the counting can be read and tested without
 * a database. The window is closed at its start and open at its end: an
 * order placed in the same second as the send counts, and one placed six
 * hours later to the second belongs to whatever came next.
 */
export function ordersAfter(
  sentAt: string,
  orders: { created_at: string; total: number }[]
): { orders: number; value: number } {
  const from = new Date(sentAt).getTime();
  if (!Number.isFinite(from)) return { orders: 0, value: 0 };
  const until = from + WINDOW;

  let count = 0;
  let value = 0;
  for (const order of orders) {
    const at = new Date(order.created_at).getTime();
    if (!Number.isFinite(at) || at < from || at >= until) continue;
    count += 1;
    value += order.total;
  }
  return { orders: count, value };
}

/**
 * What the chip says, and whether it reads as mint or as wash.
 *
 * Worded as a correlation, because that is all it is: the orders came after
 * the send, not necessarily because of it. So "3 orders after", never
 * "3 orders from this", and never a percentage of anything. The money is in
 * the chip because the count alone cannot tell a block order from somebody
 * buying one drink.
 */
export function outcomeChip(outcome: { orders: number; value: number }): {
  label: string;
  good: boolean;
} {
  if (outcome.orders === 0) return { label: "No orders after", good: false };
  return {
    label:
      `${outcome.orders} order${outcome.orders === 1 ? "" : "s"} after · ` +
      naira(outcome.value),
    good: true,
  };
}

/**
 * Written down after the send has already gone.
 *
 * Nothing in here may fail the send. The phones have buzzed by the time
 * this runs and there is no taking that back, so a database that is down,
 * a column that is missing or a schema cache that has not caught up all
 * end the same way: the history loses a row and the person who pressed the
 * button is still told it went.
 */
export async function recordDealSend(one: {
  title: string;
  body: string;
  path: string;
  sent: number;
  audience: number;
}): Promise<void> {
  try {
    await db().from("deal_sends").insert({
      title: one.title,
      body: one.body,
      path: one.path,
      sent: one.sent,
      audience: one.audience,
    });
  } catch {
    // Deliberately silent. See above.
  }
}

/** The last few sends, newest first. Empty rather than throwing, because a page that cannot read the history still has a form worth using. */
export async function dealSends(limit = 6): Promise<DealSend[]> {
  try {
    const { data } = await db()
      .from("deal_sends")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as DealSend[];
  } catch {
    return [];
  }
}

/**
 * The last few sends, each with the orders that followed it.
 *
 * One query for the orders rather than one per send: every window sits
 * inside the stretch from the oldest send to six hours after the newest, so
 * the rows are fetched once and counted in memory.
 */
export async function dealSendsWithOutcome(limit = 6): Promise<DealSendOutcome[]> {
  const sends = await dealSends(limit);
  if (sends.length === 0) return [];

  const moments = sends
    .map((one) => new Date(one.sent_at).getTime())
    .filter((at) => Number.isFinite(at));
  if (moments.length === 0) {
    return sends.map((one) => ({ ...one, orders: 0, value: 0 }));
  }

  let orders: { created_at: string; total: number }[] = [];
  try {
    const { data } = await db()
      .from("orders")
      .select("created_at,total")
      .gte("created_at", new Date(Math.min(...moments)).toISOString())
      .lt("created_at", new Date(Math.max(...moments) + WINDOW).toISOString());
    orders = (data ?? []) as { created_at: string; total: number }[];
  } catch {
    orders = [];
  }

  return sends.map((one) => ({ ...one, ...ordersAfter(one.sent_at, orders) }));
}
