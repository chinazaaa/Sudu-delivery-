import { unstable_cache } from "next/cache";
import { db } from "./supabase";
import { lagosInstant, lagosToday } from "./time";
import type { Settings } from "./settings";
import type { Batch, MenuItem } from "./types";
import { TZ } from "./config";

/**
 * Skincare: the same shop, a different delivery day.
 *
 * A product is already everything a menu item is, so it is one. What is
 * different is the arriving: there is one car a week, and a cut off on the
 * morning it goes. Miss it and the next one is a week later, which is not a
 * refusal: ordering is open every day of the week, and only the waiting
 * changes.
 */

export type SkincareProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string | null;
  available: boolean;
  /** Who makes it, which is the first thing anybody narrows by. */
  brand: string;
};

/** Whether the shop is open at all. Off means the page is not there. */
export function skincareOn(settings: Settings): boolean {
  return settings.skincare_on === "on";
}

/**
 * The next day the car goes, and when it stops taking orders for it.
 *
 * Saturday, with a cut off on the Saturday morning, unless admin says
 * otherwise. Order at one minute past and the date simply moves on a week,
 * which is the honest answer and not a door closing.
 */
export function nextDrop(
  settings: Settings,
  now: Date = new Date()
): { date: string; cutOff: string } {
  const weekday = Number.isFinite(settings.skincare_day) ? settings.skincare_day : 6;
  const [hour, minute] = cutOffTime(settings.skincare_cut_off);

  // Walked a day at a time from today, in the shop's own calendar, rather
  // than by arithmetic on an instant: the difference is an hour of the year
  // somewhere, and being a day out on the one day the car goes is the whole
  // feature.
  const today = lagosToday(now);
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const date = addDays(today, ahead);
    if (dayOf(date) !== weekday) continue;
    const cutOff = lagosInstant(date, hour, minute);
    // Today counts only while there is still time to get on it.
    if (new Date(cutOff).getTime() > now.getTime()) return { date, cutOff };
  }

  // A cut off that has passed on the only matching day: the one a week out.
  const date = addDays(today, 7);
  return { date, cutOff: lagosInstant(date, hour, minute) };
}

/** "08:00" as a pair. Anything unreadable is eight in the morning. */
export function cutOffTime(text: string): [number, number] {
  const found = /^(\d{1,2})(?::(\d{2}))?$/.exec(text.trim());
  if (!found) return [8, 0];
  const hour = Math.min(23, Math.max(0, Number(found[1])));
  const minute = Math.min(59, Math.max(0, Number(found[2] ?? 0)));
  return [hour, minute];
}

function dayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function addDays(date: string, days: number): string {
  const when = new Date(`${date}T12:00:00Z`);
  when.setUTCDate(when.getUTCDate() + days);
  return when.toISOString().slice(0, 10);
}

/** "Saturday, 27 Sep", which is the whole promise in four words. */
export function dropLabel(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * The car for the next drop, made if it is not there yet.
 *
 * One batch per Saturday, shared by everybody who ordered for it, which is
 * what makes one flat fee honest: it is one car with everybody's parcels in
 * it.
 */
export async function dropBatch(
  settings: Settings,
  now: Date = new Date()
): Promise<Batch | null> {
  const { date, cutOff } = nextDrop(settings, now);

  const { data: found } = await db()
    .from("batches")
    .select("*")
    .eq("kind", "skincare")
    .eq("run_date", date)
    .eq("status", "open")
    .maybeSingle();
  if (found) return found as Batch;

  const { data, error } = await db()
    .from("batches")
    .insert({
      run_date: date,
      // The enum only knows the two, and nothing reads it on a drop.
      slot: "afternoon",
      cut_off_at: cutOff,
      delivery_window_text: settings.skincare_window || "Between 12pm and 6pm",
      status: "open",
      capacity: null,
      flash_fee: null,
      flash_fee_reason: "",
      stage: "ordering",
      stage_updated_at: new Date().toISOString(),
      kind: "skincare",
    })
    .select("*")
    .single();

  // Swallowing this is how a constraint spends a day telling customers their
  // order does not exist, so it says so where somebody can see it.
  if (error) {
    console.error("dropBatch failed:", error.message);
    return null;
  }
  return (data as Batch) ?? null;
}

/** The shop itself: one restaurant row, marked skincare. */
export async function skincareShop(): Promise<{ id: string; name: string } | null> {
  const { data, error } = await db()
    .from("restaurants")
    .select("id, name")
    .eq("kind", "skincare")
    .eq("active", true)
    .order("sort_order")
    .limit(1);
  // Before the migration runs there is no kind column, and asking for one
  // errors the whole statement. No shop is the right answer then.
  if (error) return null;
  const shop = ((data ?? []) as { id: string; name: string }[])[0];
  return shop ?? null;
}

/**
 * What there is to narrow by.
 *
 * Skincare is broad in a way a restaurant menu is not. Two thousand products
 * is a wall unless the first thing on the page is the brand somebody came
 * for and the shelf they are looking at, so both are read once and cached:
 * they change when a catalogue is imported, which is not often.
 */
export const skincareFacets = unstable_cache(
  async (): Promise<{
    shelves: { name: string; items: number }[];
    brands: { name: string; items: number }[];
  }> => {
    const shop = await skincareShop();
    if (!shop) return { shelves: [], brands: [] };

    // One column, every row. Counting is what makes the list usable: two
    // hundred shelves in the shop's own order is a wall, and the same two
    // hundred with the big ones first is a menu.
    const { data } = await db()
      .from("menu_items")
      .select("brand, shelves")
      .eq("restaurant_id", shop.id)
      .eq("available", true);

    const shelves = new Map<string, number>();
    const brands = new Map<string, number>();

    for (const one of ((data ?? []) as { brand?: string; shelves?: string }[])) {
      const brand = (one.brand ?? "").trim();
      if (brand !== "") brands.set(brand, (brands.get(brand) ?? 0) + 1);

      for (const shelf of (one.shelves ?? "").split("|")) {
        const name = shelf.trim();
        if (name !== "") shelves.set(name, (shelves.get(name) ?? 0) + 1);
      }
    }

    const listed = (counts: Map<string, number>) =>
      [...counts.entries()]
        .map(([name, items]) => ({ name, items }))
        // Biggest first, and alphabetical inside a tie, so the list is the
        // same list every time somebody opens it.
        .sort((a, b) => b.items - a.items || a.name.localeCompare(b.name));

    return { shelves: listed(shelves), brands: listed(brands) };
  },
  ["skincare-facets"],
  { revalidate: 300, tags: ["skincare"] }
);

export type Browse = {
  /** A shelf the shop files things under, by name. */
  shelf?: string;
  brand?: string;
  /** Words typed into the search box. */
  query?: string;
  /** "cheap", "dear", or the shop's own order. */
  sort?: string;
  /** What they are willing to spend, either end optional. */
  under?: number;
  over?: number;
  page?: number;
};

export const PER_PAGE = 24;

/**
 * A page of the shelf, narrowed.
 *
 * Asked of the database rather than read whole and filtered here: two
 * thousand products is half a megabyte down somebody's phone line to show
 * them twenty four.
 */
export async function browseSkincare(
  options: Browse
): Promise<{ products: SkincareProduct[]; total: number }> {
  const shop = await skincareShop();
  if (!shop) return { products: [], total: 0 };

  const page = Math.max(1, Math.floor(options.page ?? 1));
  const from = (page - 1) * PER_PAGE;

  let query = db()
    .from("menu_items")
    .select("*", { count: "exact" })
    .eq("restaurant_id", shop.id)
    .eq("available", true);

  // The bars are what make this exact: "|Skin Care|" cannot match inside
  // "|Korean Skin Care|", where a bare substring would.
  if (options.shelf) query = query.ilike("shelves", `%|${options.shelf}|%`);
  if (options.brand) query = query.eq("brand", options.brand);
  if (options.over && options.over > 0) query = query.gte("price_food", options.over);
  if (options.under && options.under > 0) query = query.lte("price_food", options.under);
  if (options.query) {
    const words = options.query.trim().replace(/[%,]/g, " ");
    if (words !== "") query = query.ilike("name", `%${words}%`);
  }

  query =
    options.sort === "cheap"
      ? query.order("price_food", { ascending: true })
      : options.sort === "dear"
        ? query.order("price_food", { ascending: false })
        : query.order("sort_order");

  const { data, count, error } = await query.range(from, from + PER_PAGE - 1);
  if (error) return { products: [], total: 0 };

  return {
    products: ((data ?? []) as MenuItem[]).map(toProduct),
    total: count ?? 0,
  };
}

/** One product, by id, for the page that shows it on its own. */
export async function skincareProduct(id: string): Promise<SkincareProduct | null> {
  const { data } = await db().from("menu_items").select("*").eq("id", id).maybeSingle();
  return data ? toProduct(data as MenuItem) : null;
}

function toProduct(one: MenuItem): SkincareProduct {
  return {
    id: one.id,
    name: one.name,
    description: one.description ?? "",
    price: one.price_food,
    imageUrl: one.image_url ?? "",
    categoryId: one.category_id ?? null,
    available: one.available,
    brand: (one.brand ?? "").trim(),
  };
}
