import { db } from "./supabase";
import { isGone, isPaid, NOT_ORDERS_SQL } from "./orders";
import { SLOT_LABEL } from "./config";
import { runDateLabel } from "./time";
import { channelLabel } from "./came-from";

export type Traffic = {
  days: number;
  views: number;
  visitors: number;
  /** Views per day, oldest first, for the little bar chart. */
  perDay: { date: string; views: number; visitors: number }[];
  /** The busiest pages, with a readable name. */
  pages: { path: string; label: string; views: number }[];
  /** Where people came from, by site. Empty means typed or a private link. */
  sources: { source: string; views: number }[];
};

/**
 * A channel, all the way down: how many people it brought and what they
 * actually paid.
 *
 * The sources card above it counts visits, which flatters whichever channel
 * sends the most idle browsing. This counts orders, which is the question
 * worth asking: a hundred people off Instagram who never order are worth
 * less than nine off Google who do.
 */
export type Channel = {
  channel: string;
  label: string;
  /** People who landed and were remembered as coming from here. */
  visitors: number;
  orders: number;
  paid: number;
  /** What the paid ones came to, in naira. */
  money: number;
};

export type Funnel = {
  visitors: number;
  /** People who got as far as opening their cart. */
  openedCart: number;
  /** Carts with a phone number on them, which is the last step before an
   *  order and the only one the carts table knows about: a row is written
   *  when a number is typed, because before that there is nobody to chase. */
  gaveNumber: number;
  orders: number;
  paid: number;
};

type Summary = {
  views: number;
  visitors: number;
  reachedCart: number;
  perDay: { date: string; views: number; visitors: number }[];
  pages: { path: string; views: number }[];
  sources: { source: string; views: number }[];
  channels: { channel: string; visitors: number }[];
  ids: string[];
};

/**
 * The counting, done in the database.
 *
 * It used to read every row of the window and count them here, on the
 * reasoning that the numbers were small and one query beat six. The numbers
 * stopped being small, and the API hands back at most a thousand rows
 * however large a limit is asked for, so views read exactly 1000 week after
 * week: not a busy shop, a full bucket. Every other number off the same rows
 * was cut by the same wall, and all of them read low rather than wrong,
 * which is the kind of wrong nobody goes looking for.
 *
 * Null still means the counting is not there at all, which reads
 * differently from zero.
 */
async function readSummary(days: number): Promise<Summary | null> {
  try {
    const { data, error } = await db().rpc("analytics_summary", { days });
    if (error) throw new Error(error.message);
    if (!data) return null;

    const row = data as Record<string, any>;
    return {
      views: Number(row.views ?? 0),
      visitors: Number(row.visitors ?? 0),
      reachedCart: Number(row.reached_cart ?? 0),
      perDay: ((row.per_day ?? []) as Record<string, any>[]).map((one) => ({
        date: String(one.date),
        views: Number(one.views ?? 0),
        visitors: Number(one.visitors ?? 0),
      })),
      pages: ((row.pages ?? []) as Record<string, any>[]).map((one) => ({
        path: String(one.path),
        views: Number(one.views ?? 0),
      })),
      sources: ((row.sources ?? []) as Record<string, any>[]).map((one) => ({
        source: String(one.source ?? ""),
        views: Number(one.views ?? 0),
      })),
      channels: ((row.channels ?? []) as Record<string, any>[]).map((one) => ({
        channel: String(one.channel ?? ""),
        visitors: Number(one.visitors ?? 0),
      })),
      ids: ((row.ids ?? []) as string[]).map((one) => String(one)),
    };
  } catch {
    return null;
  }
}

/** "/r/abc" is nobody's idea of a page name. */
function label(path: string, names: Map<string, string>): string {
  if (path === "/") return "Home";
  if (path === "/cart") return "Cart";
  if (path === "/checkout") return "Checkout";
  if (path === "/orders") return "My orders";
  if (path === "/reorder") return "Order again";
  // Screens the app has and the website does not. The rest of its paths are
  // the website's, on purpose, so the two do not read as two shops.
  if (path === "/account") return "You, in the app";
  if (path.startsWith("/o/")) return "An order page";

  const id = path.split("/")[2] ?? "";
  const known = names.get(id);
  if (path.startsWith("/r/")) return known ? `${known}, menu` : "A restaurant";
  if (path.startsWith("/p/")) return known ? known : "A product";
  return path;
}

/**
 * What the shop has been looked at with, over the last few days.
 *
 * Every count is worked out here rather than in the database, because the
 * numbers are small and one query beats six.
 */
export async function traffic(days = 7): Promise<Traffic | null> {
  const sum = await readSummary(days);
  if (sum === null) return null;

  // Names for the ids in the paths, so the list reads like a menu.
  const ids = [
    ...new Set(sum.ids.map((path) => path.split("/")[2]).filter(Boolean)),
  ].slice(0, 200);

  const names = new Map<string, string>();
  if (ids.length > 0) {
    try {
      const [{ data: places }, { data: items }] = await Promise.all([
        db().from("restaurants").select("id, name").in("id", ids),
        db().from("menu_items").select("id, name").in("id", ids),
      ]);
      for (const row of [...(places ?? []), ...(items ?? [])] as { id: string; name: string }[]) {
        names.set(row.id, row.name);
      }
    } catch {
      /* Without names the paths still read, just less kindly. */
    }
  }

  // Referrers are tidied here rather than in SQL: the same host arrives with
  // and without a www, and two rows for one place is not a source list.
  const bySource = new Map<string, number>();
  for (const one of sum.sources) {
    const source = one.source.replace(/^www\./, "") || "Typed or a link";
    bySource.set(source, (bySource.get(source) ?? 0) + one.views);
  }

  return {
    days,
    views: sum.views,
    visitors: sum.visitors,
    perDay: sum.perDay,
    pages: sum.pages.map((one) => ({
      path: one.path,
      label: label(one.path, names),
      views: one.views,
    })),
    sources: [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, views]) => ({ source, views })),
  };
}

/**
 * How far people get: looked, filled a cart, ordered, paid.
 *
 * The last three come from the shop's own tables, so they are right whether
 * or not anything is counting views.
 */
export async function funnel(days = 7): Promise<Funnel> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  let carts = 0;
  let orders = 0;
  let paid = 0;

  try {
    const { count } = await db()
      .from("carts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    carts = count ?? 0;
  } catch {
    /* One number missing should not take the page with it. */
  }

  try {
    const { count } = await db()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .not("status", "in", NOT_ORDERS_SQL);
    orders = count ?? 0;
  } catch {
    /* As above. */
  }

  try {
    const { count } = await db()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .neq("status", "pending")
      .not("status", "in", NOT_ORDERS_SQL);
    paid = count ?? 0;
  } catch {
    /* As above. */
  }

  const sum = await readSummary(days);

  return {
    visitors: sum?.visitors ?? 0,
    // Both baskets. The skincare shelf has a basket of its own and its
    // orders are counted in the step below, so leaving it out put more
    // orders in the funnel than people who reached a cart, which is a shape
    // that cannot happen and made the whole thing read as a lie.
    openedCart: sum?.reachedCart ?? 0,
    gaveNumber: carts,
    orders,
    paid,
  };
}

export type Verdict = {
  id: string;
  ref: string;
  name: string;
  rating: number;
  feedback: string;
  when: string;
  run: string;
};

export type Feedback = {
  /** Null while nothing has been rated, so the page can say so rather than
   *  claiming an average of nothing. */
  average: number | null;
  count: number;
  /** How many gave each score, one to five. */
  spread: Record<number, number>;
  /** The ones with something written, newest first. Those are the ones worth
   *  reading; a bare five stars says only that it went fine. */
  recent: Verdict[];
  /** Every answer, written or not, for the page that is only about these. */
  all: Verdict[];
};

/**
 * What people said about their food.
 *
 * Read from the orders themselves rather than a table of its own, because a
 * rating belongs to one order and only that order can carry it.
 */
export async function feedback(days = 28): Promise<Feedback> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data } = await db()
    .from("orders")
    .select("id, order_no, customer_name, for_name, rating, feedback, rated_at, batch_id")
    .not("rating", "is", null)
    .gte("rated_at", since)
    .order("rated_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as {
    id: string;
    order_no: number | null;
    customer_name: string;
    for_name: string | null;
    rating: number;
    feedback: string;
    rated_at: string;
    batch_id: string;
  }[];

  const spread: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) spread[row.rating] = (spread[row.rating] ?? 0) + 1;

  const labels = await runLabels([...new Set(rows.map((row) => row.batch_id))]);

  return {
    average: rows.length
      ? Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length) * 10) / 10
      : null,
    count: rows.length,
    spread,
    all: rows.map((row) => ({
      id: row.id,
      ref: row.order_no ? `#${row.order_no}` : "",
      name: row.for_name ?? row.customer_name,
      rating: row.rating,
      feedback: row.feedback,
      when: row.rated_at,
      run: labels.get(row.batch_id) ?? "",
    })),
    recent: rows
      .filter((row) => row.feedback.trim() !== "")
      .slice(0, 25)
      .map((row) => ({
        id: row.id,
        ref: row.order_no ? `#${row.order_no}` : "",
        name: row.for_name ?? row.customer_name,
        rating: row.rating,
        feedback: row.feedback,
        when: row.rated_at,
        run: labels.get(row.batch_id) ?? "",
      })),
  };
}

/** Run labels for a set of batches, so a comment says which run it was about. */
async function runLabels(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await db().from("batches").select("id, run_date, slot").in("id", ids);
  return new Map(
    (data ?? []).map((row) => [
      row.id as string,
      `${runDateLabel(row.run_date as string)} · ${SLOT_LABEL[row.slot as keyof typeof SLOT_LABEL]}`,
    ])
  );
}

export type ShelfNumbers = {
  orders: number;
  paid: number;
  /** What the products came to, and what delivery came to, kept apart: they
   *  are two different arguments about whether this is working. */
  food: number;
  delivery: number;
  /** The next car, and what is already on it. */
  waiting: number;
  top: { name: string; qty: number }[];
};

/**
 * The skincare shelf on its own.
 *
 * Its orders are ordinary orders and land in every total on this page, which
 * is right: money is money. What that hides is whether the shelf is working,
 * because two thousand products next to a pizza shop is either a second
 * business or a page nobody opens, and one number cannot say which.
 */
export async function shelfNumbers(days = 7): Promise<ShelfNumbers | null> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: cars, error } = await db()
    .from("batches")
    .select("id, status")
    .eq("kind", "skincare");
  // No column, no shelf, nothing to say.
  if (error) return null;

  const ids = ((cars ?? []) as { id: string; status: string }[]).map((one) => one.id);
  if (ids.length === 0) return { orders: 0, paid: 0, food: 0, delivery: 0, waiting: 0, top: [] };

  const open = ((cars ?? []) as { id: string; status: string }[])
    .filter((one) => one.status === "open")
    .map((one) => one.id);

  const { data: orders } = await db()
    .from("orders")
    .select("id, batch_id, status, subtotal_food, fee")
    .in("batch_id", ids)
    .gte("created_at", since)
    .not("status", "in", NOT_ORDERS_SQL);

  const rows = ((orders ?? []) as {
    id: string;
    batch_id: string;
    status: string;
    subtotal_food: number;
    fee: number;
  }[]).filter((one) => !isGone(one.status));

  // What people actually bought, so the next import knows what to keep in
  // stock. Only from the orders just counted, which keeps it to one query.
  const top: { name: string; qty: number }[] = [];
  if (rows.length > 0) {
    const { data: items } = await db()
      .from("order_items")
      .select("menu_item_id, qty")
      .in("order_id", rows.map((one) => one.id).slice(0, 200));

    const counts = new Map<string, number>();
    for (const one of ((items ?? []) as { menu_item_id: string; qty: number }[])) {
      counts.set(one.menu_item_id, (counts.get(one.menu_item_id) ?? 0) + one.qty);
    }

    const wanted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (wanted.length > 0) {
      const { data: named } = await db()
        .from("menu_items")
        .select("id, name")
        .in("id", wanted.map(([id]) => id));
      const names = new Map(
        ((named ?? []) as { id: string; name: string }[]).map((one) => [one.id, one.name])
      );
      for (const [id, qty] of wanted) top.push({ name: names.get(id) ?? "Gone", qty });
    }
  }

  return {
    orders: rows.length,
    paid: rows.filter((one) => isPaid(one.status)).length,
    food: rows.reduce((sum, one) => sum + one.subtotal_food, 0),
    delivery: rows.reduce((sum, one) => sum + one.fee, 0),
    // On the car that has not gone yet, whenever it was ordered.
    waiting: rows.filter((one) => open.includes(one.batch_id)).length,
    top,
  };
}

export type BoxNumbers = {
  orders: number;
  paid: number;
  food: number;
  delivery: number;
  /** Each box that sold, dearest first by what it brought in. */
  boxes: { name: string; occasion: string; orders: number; money: number }[];
  /** Occasions nobody has ordered from, which is as useful as the ones
   *  that sold: an occasion with views and no orders is a wrong basket,
   *  and one with neither is a wrong occasion. */
  quiet: string[];
};

/**
 * Boxes on their own.
 *
 * Their orders are ordinary orders and land in every total on this page,
 * which is right: money is money. What that hides is which box anybody
 * wanted, and that is the whole reason for packing three rather than one.
 * Three cards selling evenly and one card selling everything are the same
 * revenue and completely different businesses.
 */
export async function boxNumbers(days = 28): Promise<BoxNumbers | null> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: orders, error } = await db()
    .from("orders")
    .select("box_id, subtotal_food, fee, paid_at")
    .gte("created_at", since)
    .not("box_id", "is", null)
    .not("status", "in", NOT_ORDERS_SQL);

  // The column is not there yet, which reads differently from nobody having
  // ordered a box.
  if (error) return null;

  const { data: boxes } = await db().from("boxes").select("id, name, occasion_id");
  const { data: occasions } = await db().from("occasions").select("id, name, active");

  const occasionName = new Map(
    (occasions ?? []).map((one: any) => [one.id as string, one.name as string])
  );
  const box = new Map(
    (boxes ?? []).map((one: any) => [
      one.id as string,
      { name: one.name as string, occasion: occasionName.get(one.occasion_id) ?? "" },
    ])
  );

  const tally = new Map<string, { orders: number; money: number }>();
  let food = 0;
  let delivery = 0;
  let paid = 0;

  for (const row of (orders ?? []) as any[]) {
    food += Number(row.subtotal_food ?? 0);
    delivery += Number(row.fee ?? 0);
    if (row.paid_at) paid += 1;

    const now = tally.get(row.box_id) ?? { orders: 0, money: 0 };
    tally.set(row.box_id, {
      orders: now.orders + 1,
      money: now.money + Number(row.subtotal_food ?? 0) + Number(row.fee ?? 0),
    });
  }

  const sold = new Set<string>();
  const rows = [...tally.entries()]
    .map(([id, one]) => {
      const named = box.get(id);
      if (named) sold.add(named.occasion);
      return {
        name: named?.name ?? "A box that has been deleted",
        occasion: named?.occasion ?? "",
        orders: one.orders,
        money: one.money,
      };
    })
    .sort((a, b) => b.money - a.money);

  return {
    orders: (orders ?? []).length,
    paid,
    food,
    delivery,
    boxes: rows,
    quiet: (occasions ?? [])
      .filter((one: any) => one.active !== false && !sold.has(one.name))
      .map((one: any) => one.name as string),
  };
}

export type ParcelNumbers = {
  sent: number;
  paid: number;
  money: number;
  /** Still waiting on a day from the shop, which is work rather than money. */
  waitingOnDay: number;
  /** Carried and handed over, so the promise was kept. */
  delivered: number;
  /** Routes, busiest first, with what each brought in. */
  routes: { route: string; sent: number; money: number }[];
  /** Trips actually driven, against parcels carried: two parcels sharing a
   *  car is the whole reason this is worth watching. */
  trips: number;
};

/**
 * Parcels, which are neither food nor a shelf.
 *
 * Kept apart from the rest because nothing is bought on one: every naira is
 * the fee, so a parcel folded into "money in" against "food cost" reads as a
 * run with a perfect margin and quietly flatters every other number.
 */
export async function parcelNumbers(days = 7): Promise<ParcelNumbers | null> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data: orders, error } = await db()
    .from("orders")
    .select("id, batch_id, status, fee, total, parcel_route")
    .not("parcel_route", "is", null)
    .gte("created_at", since);
  // No column, no parcels, nothing to say.
  if (error) return null;

  const rows = ((orders ?? []) as {
    id: string;
    batch_id: string;
    status: string;
    fee: number;
    total: number;
    parcel_route: string | null;
  }[]).filter((one) => !isGone(one.status));

  if (rows.length === 0) {
    return {
      sent: 0,
      paid: 0,
      money: 0,
      waitingOnDay: 0,
      delivered: 0,
      routes: [],
      trips: 0,
    };
  }

  const { data: trips } = await db()
    .from("batches")
    .select("id, deliver_at, stage")
    .in("id", rows.map((one) => one.batch_id));
  const trip = new Map(
    ((trips ?? []) as { id: string; deliver_at: string | null; stage: string }[]).map(
      (one) => [one.id, one]
    )
  );

  const paid = rows.filter((one) => isPaid(one.status));
  const byRoute = new Map<string, { sent: number; money: number }>();
  for (const row of rows) {
    const key = row.parcel_route ?? "";
    const now = byRoute.get(key) ?? { sent: 0, money: 0 };
    byRoute.set(key, {
      sent: now.sent + 1,
      money: now.money + (isPaid(row.status) ? row.total : 0),
    });
  }

  return {
    sent: rows.length,
    paid: paid.length,
    money: paid.reduce((total, one) => total + one.total, 0),
    waitingOnDay: rows.filter((one) => !trip.get(one.batch_id)?.deliver_at).length,
    delivered: rows.filter((one) => trip.get(one.batch_id)?.stage === "handed_out").length,
    routes: [...byRoute.entries()]
      .map(([route, one]) => ({ route, ...one }))
      .sort((a, b) => b.sent - a.sent),
    // The trips those parcels actually took, which is fewer than the parcels
    // wherever two shared a car.
    trips: new Set(rows.map((one) => one.batch_id)).size,
  };
}

/**
 * Orders by where the person came from, over the last so many days.
 *
 * Only orders placed since the column existed can say anything, so a shop
 * that has just turned this on sees nearly everything under "not known" for
 * a while. That is honest, and better than spreading a guess across the
 * channels to make the card look finished.
 */
export async function channels(days = 28): Promise<Channel[] | null> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  let orders: { came_from: string; status: string; total: number }[];
  try {
    const { data, error } = await db()
      .from("orders")
      .select("came_from, status, total")
      .gte("created_at", since)
      .not("status", "in", NOT_ORDERS_SQL)
      .limit(20000);
    if (error) throw new Error(error.message);
    orders = (data ?? []) as typeof orders;
  } catch {
    // The column is not there yet. Nothing to show, and nothing broken.
    return null;
  }

  const counts = new Map<string, Channel>();
  const of = (channel: string): Channel => {
    const found = counts.get(channel);
    if (found) return found;
    const made: Channel = {
      channel,
      label: channelLabel(channel),
      visitors: 0,
      orders: 0,
      paid: 0,
      money: 0,
    };
    counts.set(channel, made);
    return made;
  };

  for (const row of orders) {
    const one = of(row.came_from ?? "");
    one.orders += 1;
    if (isPaid(row.status)) {
      one.paid += 1;
      one.money += row.total ?? 0;
    }
  }

  // How many people each channel put on the site at all, so a channel that
  // brings a crowd and no orders is visibly doing that rather than missing.
  // Counted in the database for the same reason as everything else off this
  // table: reading the rows to count them stopped at a thousand of them, and
  // a channel that brought two thousand people read as one that brought part
  // of a week.
  const sum = await readSummary(days);
  for (const one of sum?.channels ?? []) of(one.channel).visitors = one.visitors;

  return [...counts.values()]
    .filter((one) => one.orders > 0 || one.visitors > 0)
    .sort((a, b) => b.money - a.money || b.orders - a.orders || b.visitors - a.visitors);
}
