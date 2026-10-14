import { db } from "./supabase";
import { TZ } from "./config";
import { naira } from "./money";
import { isGone } from "./orders";

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
  /** Orders for the thing it pointed at, and what they came to. Where it
   *  pointed at the shop front, every order in the window. */
  orders: number;
  value: number;
  /** Everything else placed in the window. Said separately rather than
   *  added in: a notification about the Liverpool boxes followed by two
   *  orders of something else is two orders of something else. */
  others: number;
  /** What it pointed at, for the chip to name. Empty where it pointed at
   *  the shop front and there is nothing in particular to have ordered. */
  aimed: string;
};

/**
 * What a send pointed at, read back off the path it was sent with.
 *
 * The path is built from a dropdown rather than typed, so these are the
 * only shapes there are. Anything unrecognised reads as the shop front,
 * which is the honest reading: we cannot say what somebody was meant to
 * order, so we do not pretend to.
 */
export type Aim =
  | { kind: "shop" }
  | { kind: "collection"; slug: string }
  | { kind: "restaurant"; id: string }
  | { kind: "skincare" };

export function aimOf(path: string): Aim {
  const said = String(path ?? "").trim();
  const collection = said.match(/^\/collections\/([^/?#]+)/);
  if (collection) return { kind: "collection", slug: collection[1] };
  const shop = said.match(/^\/r\/([^/?#]+)/);
  if (shop) return { kind: "restaurant", id: shop[1] };
  if (said.startsWith("/skincare")) return { kind: "skincare" };
  return { kind: "shop" };
}

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
  orders: { created_at: string; total: number; wanted?: boolean }[]
): { orders: number; value: number; others: number } {
  const from = new Date(sentAt).getTime();
  if (!Number.isFinite(from)) return { orders: 0, value: 0, others: 0 };
  const until = from + WINDOW;

  let count = 0;
  let value = 0;
  let others = 0;
  for (const order of orders) {
    const at = new Date(order.created_at).getTime();
    if (!Number.isFinite(at) || at < from || at >= until) continue;
    // Undecided is counted, because a send that pointed at the shop front
    // has nothing in particular to have been ordered and every order in
    // the window is as much its as any other.
    if (order.wanted === false) {
      others += 1;
      continue;
    }
    count += 1;
    value += order.total;
  }
  return { orders: count, value, others };
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
export function outcomeChip(outcome: {
  orders: number;
  value: number;
  aimed?: string;
}): {
  label: string;
  good: boolean;
} {
  // It pointed at one thing, so the chip is about that thing. Two orders of
  // something else in the same afternoon are not what the Liverpool boxes
  // did, and a chip that counted them said they were.
  const aimed = (outcome.aimed ?? "").trim();
  if (outcome.orders === 0) {
    return { label: aimed === "" ? "No orders after" : `No ${aimed} after`, good: false };
  }
  if (aimed !== "") {
    return {
      label: `${outcome.orders} ${aimed} · ${naira(outcome.value)}`,
      good: true,
    };
  }
  return {
    label:
      `${outcome.orders} order${outcome.orders === 1 ? "" : "s"} after · ` +
      naira(outcome.value),
    good: true,
  };
}

/** "and 2 other orders", for the line under the chip. Empty where there
 *  were none, so the card says nothing rather than saying zero. */
export function othersLine(others: number): string {
  if (others <= 0) return "";
  return `${others} other order${others === 1 ? "" : "s"} in the same hours.`;
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
type WindowOrder = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  box_id: string | null;
  batch_id: string | null;
};

export async function dealSendsWithOutcome(limit = 6): Promise<DealSendOutcome[]> {
  const sends = await dealSends(limit);
  if (sends.length === 0) return [];

  const moments = sends
    .map((one) => new Date(one.sent_at).getTime())
    .filter((at) => Number.isFinite(at));
  if (moments.length === 0) {
    return sends.map((one) => ({ ...one, orders: 0, value: 0, others: 0, aimed: "" }));
  }

  let orders: WindowOrder[] = [];
  try {
    const { data } = await db()
      .from("orders")
      .select("id,created_at,total,status,box_id,batch_id")
      .gte("created_at", new Date(Math.min(...moments)).toISOString())
      .lt("created_at", new Date(Math.max(...moments) + WINDOW).toISOString());
    orders = (data ?? []) as WindowOrder[];
  } catch {
    orders = [];
  }

  // A cancelled order is a duplicate somebody placed twice and a refunded
  // one is money we gave back. Neither is a thing a notification did.
  orders = orders.filter((one) => !isGone(one.status));

  const what = await whatTheyHeldOrNothing(sends.map((one) => aimOf(one.path)), orders);

  return sends.map((one) => {
    const aim = aimOf(one.path);
    const wants = what.wanted(aim);
    const counted = orders.map((order) => ({
      created_at: order.created_at,
      total: order.total,
      wanted: wants === null ? undefined : wants.has(order.id),
    }));
    return { ...one, ...ordersAfter(one.sent_at, counted), aimed: what.named(aim) };
  });
}

/**
 * Which orders in the window actually held the thing each send pointed at.
 *
 * Everything is read once for every send rather than once per send, and
 * nothing is read at all where no send points at that kind of thing: a
 * month of notifications about the shop front costs no extra query.
 *
 * Anything that cannot be worked out comes back as "no opinion", and an
 * aim with no opinion counts every order in its window, which is exactly
 * what the page did before any of this. Being unable to tell is not the
 * same as the answer being none.
 */
async function whatTheyHeldOrNothing(aims: Aim[], orders: WindowOrder[]) {
  const ids = orders.map((one) => one.id);

  // The boxes each collection holds, so an order carrying one of them is an
  // order of that collection.
  const slugs = [...new Set(aims.flatMap((one) => (one.kind === "collection" ? [one.slug] : [])))];
  const boxesOfSlug = new Map<string, Set<string>>();
  const nameOfSlug = new Map<string, string>();
  if (slugs.length > 0) {
    try {
      const { data: shelves } = await db()
        .from("occasions")
        .select("id,slug,name")
        .in("slug", slugs);
      const rows = (shelves ?? []) as { id: string; slug: string; name: string }[];
      for (const row of rows) nameOfSlug.set(row.slug, row.name);
      if (rows.length > 0) {
        const { data: boxes } = await db()
          .from("boxes")
          .select("id,occasion_id")
          .in("occasion_id", rows.map((one) => one.id));
        const slugOf = new Map(rows.map((one) => [one.id, one.slug]));
        for (const box of (boxes ?? []) as { id: string; occasion_id: string }[]) {
          const slug = slugOf.get(box.occasion_id);
          if (!slug) continue;
          const set = boxesOfSlug.get(slug) ?? new Set<string>();
          set.add(box.id);
          boxesOfSlug.set(slug, set);
        }
      }
    } catch {
      boxesOfSlug.clear();
    }
  }

  // Which counters each order drew on, for a send that pointed at one shop.
  const shops = [...new Set(aims.flatMap((one) => (one.kind === "restaurant" ? [one.id] : [])))];
  const ordersOfShop = new Map<string, Set<string>>();
  const nameOfShop = new Map<string, string>();
  if (shops.length > 0 && ids.length > 0) {
    try {
      const { data: places } = await db()
        .from("restaurants")
        .select("id,name")
        .in("id", shops);
      for (const place of (places ?? []) as { id: string; name: string }[]) {
        nameOfShop.set(place.id, place.name);
      }
      const { data: lines } = await db()
        .from("order_items")
        .select("order_id,menu_item_id")
        .in("order_id", ids);
      const rows = (lines ?? []) as { order_id: string; menu_item_id: string }[];
      const dishes = [...new Set(rows.map((one) => one.menu_item_id))];
      if (dishes.length > 0) {
        const { data: items } = await db()
          .from("menu_items")
          .select("id,restaurant_id")
          .in("id", dishes);
        const shopOf = new Map(
          ((items ?? []) as { id: string; restaurant_id: string }[]).map((one) => [
            one.id,
            one.restaurant_id,
          ])
        );
        for (const row of rows) {
          const shop = shopOf.get(row.menu_item_id);
          if (!shop || !shops.includes(shop)) continue;
          const set = ordersOfShop.get(shop) ?? new Set<string>();
          set.add(row.order_id);
          ordersOfShop.set(shop, set);
        }
      }
    } catch {
      ordersOfShop.clear();
    }
  }

  // The skincare drop is its own car, so an order on one is a skincare order.
  let skincare: Set<string> | null = null;
  if (aims.some((one) => one.kind === "skincare")) {
    try {
      const cars = [...new Set(orders.map((one) => one.batch_id).filter(Boolean))] as string[];
      if (cars.length > 0) {
        const { data } = await db().from("batches").select("id,kind").in("id", cars);
        const drops = new Set(
          ((data ?? []) as { id: string; kind: string }[])
            .filter((one) => one.kind === "skincare")
            .map((one) => one.id)
        );
        skincare = new Set(
          orders.filter((one) => one.batch_id && drops.has(one.batch_id)).map((one) => one.id)
        );
      } else {
        skincare = new Set<string>();
      }
    } catch {
      skincare = null;
    }
  }

  return {
    /** The orders that hold what this aim points at, or null for no opinion. */
    wanted(aim: Aim): Set<string> | null {
      if (aim.kind === "shop") return null;
      if (aim.kind === "collection") {
        const boxes = boxesOfSlug.get(aim.slug);
        if (!boxes) return null;
        return new Set(
          orders.filter((one) => one.box_id && boxes.has(one.box_id)).map((one) => one.id)
        );
      }
      if (aim.kind === "restaurant") {
        return ordersOfShop.get(aim.id) ?? (nameOfShop.has(aim.id) ? new Set<string>() : null);
      }
      return skincare;
    },
    /** What to call it in the chip. Empty where there is nothing to name. */
    named(aim: Aim): string {
      if (aim.kind === "collection") {
        const name = nameOfSlug.get(aim.slug);
        return name ? `${name} ${name.toLowerCase().endsWith("boxes") ? "" : "boxes"}`.trim() : "";
      }
      if (aim.kind === "restaurant") {
        const name = nameOfShop.get(aim.id);
        return name ? `from ${name}` : "";
      }
      if (aim.kind === "skincare") return "skincare orders";
      return "";
    },
  };
}
