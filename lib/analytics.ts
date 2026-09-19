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
  const reached = (prefix: string) =>
    new Set(
      seen.filter((row) => row.path.startsWith(prefix)).map((row) => row.visitor)
    ).size;

  return {
    visitors: new Set(seen.map((row) => row.visitor)).size,
    openedCart: reached("/cart"),
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
