import { unstable_cache } from "next/cache";
import { db } from "./supabase";
import { pctOf } from "./containers";
import { lagosInstant, lagosToday } from "./time";
import { activeBands, safeSettings, type Settings } from "./settings";
import { feeFor, parseBands, type Band } from "./fees";
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
  /** How much of the car it takes, as a percentage of one container. */
  containerPct: number;
  /** Who makes it, which is the first thing anybody narrows by. */
  brand: string;
};

/**
 * What delivery costs on a skincare order.
 *
 * A ladder, for the same reason the food has one: it is the car, not the
 * cream, and four bottles and fifteen bottles do not take the same room. A
 * shop that has not written one yet falls back to the flat fee it started
 * with, which is a ladder of one band.
 */
export function skincareBands(settings: Settings): Band[] {
  return settings.skincare_bands.trim() !== ""
    ? parseBands(settings.skincare_bands)
    : [{ maxItems: Infinity, fee: Math.max(0, settings.skincare_fee) }];
}

/** What this basket would pay, by that ladder. */
export function skincareFee(settings: Settings, items: number): number {
  return feeFor(items, null, skincareBands(settings));
}

/**
 * Why the products are real, said in one line.
 *
 * Skincare is the one thing people are right to be careful about: a
 * counterfeit serum is not a disappointing dinner, it is somebody's face.
 * Nothing on the shelf said where any of it came from, and a shelf that does
 * not answer that question has answered it badly.
 *
 * A default in the code rather than an empty string, so it reads right from
 * the first minute, and a setting over the top of it because it is a claim
 * about how the shop buys and the shop should word it.
 */
export const PROMISE = "Sourced from authorised Lagos retailers.";

export function skincarePromise(settings: Settings): string {
  return settings.skincare_promise.trim() || PROMISE;
}

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
    containerPct: pctOf(one),
    available: one.available,
    brand: (one.brand ?? "").trim(),
  };
}

/**
 * Whether a link points at the skincare shelf rather than a restaurant.
 *
 * Asked only when a restaurant page has already failed to find a menu, so
 * the cost is paid on a page that was going to be a not-found anyway.
 */
export async function isSkincare(ref: string): Promise<boolean> {
  const shop = await skincareShop();
  if (!shop) return false;
  if (shop.id === ref) return true;

  const { data } = await db()
    .from("restaurants")
    .select("id")
    .eq("slug", ref)
    .maybeSingle();
  return Boolean(data && (data as { id: string }).id === shop.id);
}

/**
 * Whether any of these products belong to the skincare shelf.
 *
 * Asked on the way into an order, because the shelf and the menu are two
 * different days and a basket holding both cannot be one delivery.
 */
export async function skincareIn(itemIds: string[]): Promise<boolean> {
  const shop = await skincareShop();
  if (!shop || itemIds.length === 0) return false;

  const { data } = await db()
    .from("menu_items")
    .select("id")
    .eq("restaurant_id", shop.id)
    .in("id", itemIds.slice(0, 100))
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * The ladder a batch is priced by.
 *
 * Which car something is going in decides what delivery costs, because the
 * cost is the car. A Saturday drop full of parcels is not a Domino's run, so
 * asking the batch rather than the settings is what stops a cleanser being
 * priced as a pizza wherever a fee is worked out.
 */
export async function bandsFor(batch: { kind?: string } | null): Promise<Band[]> {
  const settings = await safeSettings();
  return (batch?.kind ?? "run") === "skincare"
    ? skincareBands(settings)
    : await activeBands();
}

/** Whether this order is skincare, for wording that would otherwise say food. */
export function isSkincareBatch(batch: { kind?: string } | null): boolean {
  return (batch?.kind ?? "run") === "skincare";
}

/**
 * Every shelf the shop has, with what is actually on it.
 *
 * Importing a catalogue makes a shelf for every collection it names, and a
 * later import leaves the ones nothing came in for standing there empty. Two
 * counts, because a shelf holds products two ways: the one a product is filed
 * under, and every one it appears on. Empty means both, so nothing is offered
 * for deletion while anything still points at it.
 */
export async function skincareShelves(): Promise<
  { id: string; name: string; items: number; filed: number }[]
> {
  const shop = await skincareShop();
  if (!shop) return [];

  const [sections, items] = await Promise.all([
    db()
      .from("menu_categories")
      .select("id, name")
      .eq("restaurant_id", shop.id)
      .order("sort_order"),
    // Everything, in stock or not: a shelf holding only what is sold out is
    // a shelf, and deleting it would lose the filing when it comes back.
    db().from("menu_items").select("category_id, shelves").eq("restaurant_id", shop.id),
  ]);

  const on = new Map<string, number>();
  const filed = new Map<string, number>();

  for (const one of ((items.data ?? []) as { category_id?: string | null; shelves?: string }[])) {
    if (one.category_id) filed.set(one.category_id, (filed.get(one.category_id) ?? 0) + 1);
    for (const shelf of (one.shelves ?? "").split("|")) {
      const name = shelf.trim();
      if (name !== "") on.set(name, (on.get(name) ?? 0) + 1);
    }
  }

  return ((sections.data ?? []) as { id: string; name: string }[])
    .map((one) => ({
      id: one.id,
      name: one.name,
      items: on.get(one.name) ?? 0,
      filed: filed.get(one.id) ?? 0,
    }))
    .sort((a, b) => a.items + a.filed - (b.items + b.filed) || a.name.localeCompare(b.name));
}
