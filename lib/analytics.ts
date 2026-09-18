import { db } from "./supabase";

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
  carts: number;
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
  return {
    visitors: rows === null ? 0 : new Set(rows.map((row) => row.visitor)).size,
    carts,
    orders,
    paid,
  };
}
