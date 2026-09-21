import { db } from "./supabase";
import { SLOT_LABEL } from "./config";
import { runDateLabel } from "./time";

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

type ViewRow = { path: string; visitor: string; referrer: string; created_at: string };

/** Null means the table is not there yet, which reads differently from zero. */
async function readViews(days: number): Promise<ViewRow[] | null> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  try {
    const { data, error } = await db()
      .from("page_views")
      .select("path, visitor, referrer, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) throw new Error(error.message);
    return (data ?? []) as ViewRow[];
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
  const rows = await readViews(days);
  if (rows === null) return null;

  // Names for the ids in the paths, so the list reads like a menu.
  const ids = [
    ...new Set(
      rows
        .filter((row) => row.path.startsWith("/r/") || row.path.startsWith("/p/"))
        .map((row) => row.path.split("/")[2])
        .filter(Boolean)
    ),
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

  const byPath = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byDay = new Map<string, { views: number; visitors: Set<string> }>();

  for (const row of rows) {
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + 1);

    const source = row.referrer.replace(/^www\./, "") || "Typed or a link";
    bySource.set(source, (bySource.get(source) ?? 0) + 1);

    const date = row.created_at.slice(0, 10);
    const day = byDay.get(date) ?? { views: 0, visitors: new Set<string>() };
    day.views += 1;
    day.visitors.add(row.visitor);
    byDay.set(date, day);
  }

  return {
    days,
    views: rows.length,
    visitors: new Set(rows.map((row) => row.visitor)).size,
    perDay: [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, day]) => ({ date, views: day.views, visitors: day.visitors.size })),
    pages: [...byPath.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([path, views]) => ({ path, label: label(path, names), views })),
    sources: [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
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
      .gte("created_at", since);
    orders = count ?? 0;
  } catch {
    /* As above. */
  }

  try {
    const { count } = await db()
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .neq("status", "pending");
    paid = count ?? 0;
  } catch {
    /* As above. */
  }

  const rows = await readViews(days);
  const seen = rows ?? [];

  // Reaching the cart is a real step and the views know it. Counting the
  // carts table for this called somebody who typed their number a cart, which
  // put the second step of the funnel below the last one and made the whole
  // shape a lie.
  const reached = (...prefixes: string[]) =>
    new Set(
      seen
        .filter((row) => prefixes.some((prefix) => row.path.startsWith(prefix)))
        .map((row) => row.visitor)
    ).size;

  return {
    visitors: new Set(seen.map((row) => row.visitor)).size,
    // Both baskets. The skincare shelf has a basket of its own and its
    // orders are counted in the step below, so leaving it out put more
    // orders in the funnel than people who reached a cart, which is a shape
    // that cannot happen and made the whole thing read as a lie.
    openedCart: reached("/cart", "/skincare"),
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
    .gte("created_at", since);

  const rows = ((orders ?? []) as {
    id: string;
    batch_id: string;
    status: string;
    subtotal_food: number;
    fee: number;
  }[]).filter((one) => one.status !== "refunded");

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
    paid: rows.filter((one) => one.status !== "pending").length,
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
    .neq("status", "cancelled");

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
