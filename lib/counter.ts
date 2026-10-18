import { unstable_cache } from "next/cache";
import { db } from "./supabase";
import { pctOf } from "./containers";
import { lagosInstant, lagosToday } from "./time";
import { activeBands, safeSettings, type Settings } from "./settings";
import { feeFor, parseBands, type Band } from "./fees";
import type { Batch, MenuItem } from "./types";
import { TZ } from "./config";

/**
 * A counter: the same shop, a different delivery day.
 *
 * Skincare was the first one. A product is already everything a menu item
 * is, so it is one; what is different is the arriving. There is one car a
 * week and a cut off on the morning it goes, and missing it is not a
 * refusal, only a longer wait.
 *
 * Then the pharmacy came along and wanted exactly the same thing: its own
 * basket, its own car, its own day, eight hundred products that have no
 * business sitting between a burger and a bowl of rice. Copying four
 * hundred lines to get it would have meant two of every bug and a third
 * copy waiting the next time the shop opens a counter.
 *
 * So the day, the car, the shelf and the ladder live here once, and a
 * counter is the handful of facts that tell them apart. Everything a
 * counter needs out of settings is keyed off its own name, which is why
 * each one gets its own columns rather than a shared pile.
 */
export type Counter = {
  /** What the shop row and the batches are marked with. */
  kind: string;
  /** Where the shelf lives, for a link and a canonical. */
  href: string;
  /** What to call it before anybody has named the shop. */
  fallbackName: string;
  /** The day of the week the car goes, 0 Sunday to 6 Saturday. */
  defaultDay: number;
  /** Why the products are real, said in one line. */
  defaultPromise: string;
  /** When it lands, before admin words it. */
  defaultWindow: string;
};

/**
 * Every counter the shop runs, by kind.
 *
 * One list, because three separate things need to go from a kind to its
 * counter and none of them should be a switch somebody can forget to
 * extend: pricing an order, deciding what a batch is, and the menu knowing
 * what to keep out of itself.
 */
export const COUNTERS: Record<string, Counter> = {
  skincare: {
    kind: "skincare",
    href: "/skincare",
    fallbackName: "Skincare",
    defaultDay: 6,
    // Skincare is the one thing people are right to be careful about: a
    // counterfeit serum is not a disappointing dinner, it is somebody's
    // face.
    defaultPromise: "Sourced from authorised Lagos retailers.",
    defaultWindow: "Between 12pm and 6pm",
  },
  pharmacy: {
    kind: "pharmacy",
    href: "/pharmacy",
    fallbackName: "Pharmacy",
    defaultDay: 6,
    // The same promise and a harder one to keep, which is why it names the
    // counter it was bought over rather than only the city.
    defaultPromise: "Bought over the counter at licensed Lagos pharmacies.",
    defaultWindow: "Between 12pm and 6pm",
  },
};

/** The counter a batch belongs to, or nothing where it is an ordinary run. */
export function counterOf(batch: { kind?: string } | null | undefined): Counter | null {
  return COUNTERS[batch?.kind ?? "run"] ?? null;
}

export type CounterProduct = {
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

/*
 * Settings are one row of named columns, and a counter needs its own set of
 * them rather than a shared pile: turning the pharmacy off should not close
 * the skincare shelf. The column is the counter's name and the field, so
 * reading one means building the name, which is the one place this file is
 * allowed to be loose about types.
 */
function said(settings: Settings, counter: Counter, field: string): string {
  const got = (settings as unknown as Record<string, unknown>)[`${counter.kind}_${field}`];
  return typeof got === "string" ? got : "";
}

function counted(
  settings: Settings,
  counter: Counter,
  field: string,
  fallback: number
): number {
  const got = Number((settings as unknown as Record<string, unknown>)[`${counter.kind}_${field}`]);
  return Number.isFinite(got) ? got : fallback;
}

/**
 * What delivery costs on one of this counter's orders.
 *
 * A ladder, for the same reason the food has one: it is the car, not the
 * cream, and four bottles and fifteen bottles do not take the same room. A
 * counter that has not written one yet falls back to the flat fee it
 * started with, which is a ladder of one band.
 */
export function counterBands(counter: Counter, settings: Settings): Band[] {
  const written = said(settings, counter, "bands").trim();
  return written !== ""
    ? parseBands(written)
    : [{ maxItems: Infinity, fee: Math.max(0, counted(settings, counter, "fee", 0)) }];
}

/** What this basket would pay, by that ladder. */
export function counterFee(counter: Counter, settings: Settings, items: number): number {
  return feeFor(items, null, counterBands(counter, settings));
}

/** Why the products are real. A setting over the top of the counter's own line. */
export function counterPromise(counter: Counter, settings: Settings): string {
  return said(settings, counter, "promise").trim() || counter.defaultPromise;
}

/** Whether the counter is open at all. Off means the page is not there. */
export function counterOn(counter: Counter, settings: Settings): boolean {
  return said(settings, counter, "on") === "on";
}

/** What the shop wrote at the top of the shelf, if anything. */
export function counterBlurb(counter: Counter, settings: Settings): string {
  return said(settings, counter, "blurb");
}

/** The cut off as the shop typed it, for a page that wants to print it. */
export function counterCutOff(counter: Counter, settings: Settings): string {
  return said(settings, counter, "cut_off");
}

/**
 * The next day the car goes, and when it stops taking orders for it.
 *
 * Order at one minute past and the date simply moves on a week, which is
 * the honest answer and not a door closing.
 */
export function nextDrop(
  counter: Counter,
  settings: Settings,
  now: Date = new Date()
): { date: string; cutOff: string } {
  const weekday = counted(settings, counter, "day", counter.defaultDay);
  const [hour, minute] = cutOffTime(said(settings, counter, "cut_off"));

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
 * One batch per drop, shared by everybody who ordered for it, which is what
 * makes one flat fee honest: it is one car with everybody's parcels in it.
 */
export async function dropBatch(
  counter: Counter,
  settings: Settings,
  now: Date = new Date()
): Promise<Batch | null> {
  const { date, cutOff } = nextDrop(counter, settings, now);

  const { data: found } = await db()
    .from("batches")
    .select("*")
    .eq("kind", counter.kind)
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
      delivery_window_text:
        said(settings, counter, "window") || counter.defaultWindow,
      status: "open",
      capacity: null,
      flash_fee: null,
      flash_fee_reason: "",
      stage: "ordering",
      stage_updated_at: new Date().toISOString(),
      kind: counter.kind,
    })
    .select("*")
    .single();

  // Swallowing this is how a constraint spends a day telling customers their
  // order does not exist, so it says so where somebody can see it.
  if (error) {
    console.error(`dropBatch failed for ${counter.kind}:`, error.message);
    return null;
  }
  return (data as Batch) ?? null;
}

/** The shop itself: one restaurant row, marked with the counter's kind. */
export async function counterShop(
  counter: Counter
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await db()
    .from("restaurants")
    .select("id, name")
    .eq("kind", counter.kind)
    .eq("active", true)
    .order("sort_order")
    .limit(1);
  // Before the migration runs there is no kind column, and asking for one
  // errors the whole statement. No shop is the right answer then.
  if (error) return null;
  const shop = ((data ?? []) as { id: string; name: string }[])[0];
  return shop ?? null;
}

export type Facets = {
  shelves: { name: string; items: number }[];
  brands: { name: string; items: number }[];
};

/**
 * What there is to narrow by.
 *
 * A counter is broad in a way a restaurant menu is not. Two thousand
 * products is a wall unless the first thing on the page is the brand
 * somebody came for and the shelf they are looking at, so both are read
 * once and cached: they change when a catalogue is imported, which is not
 * often.
 *
 * Cached per counter rather than once for all of them. One cache key
 * shared between two shelves would hand the pharmacy's brands to the
 * skincare page, which is the sort of bug that looks like a refresh
 * problem for a week.
 */
const facetsBy = new Map<string, () => Promise<Facets>>();

export function counterFacets(counter: Counter): Promise<Facets> {
  let read = facetsBy.get(counter.kind);
  if (!read) {
    read = unstable_cache(
      async (): Promise<Facets> => {
        const shop = await counterShop(counter);
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
      [`counter-facets-${counter.kind}`],
      { revalidate: 300, tags: [counter.kind] }
    );
    facetsBy.set(counter.kind, read);
  }
  return read();
}

/**
 * Every product on a counter, as little as a search needs.
 *
 * The chat searches the food menu and, finding nothing, used to say "I
 * cannot find that anywhere on the shop today" over a shelf holding two
 * thousand cleansers and eight hundred drugs. To answer that honestly it
 * has to be able to look here too.
 *
 * Cached per counter, because it is read on a path that is already a miss
 * and three thousand rows fetched on every unmatched word is a tax on the
 * one case that was already going badly. Name and price only: the chat is
 * deciding what somebody meant, not what to charge them.
 */
const indexBy = new Map<string, () => Promise<{ id: string; name: string; price: number }[]>>();

export function counterIndex(
  counter: Counter
): Promise<{ id: string; name: string; price: number }[]> {
  let read = indexBy.get(counter.kind);
  if (!read) {
    read = unstable_cache(
      async () => {
        const shop = await counterShop(counter);
        if (!shop) return [];
        const { data } = await db()
          .from("menu_items")
          .select("id, name, price_food")
          .eq("restaurant_id", shop.id)
          .eq("available", true);
        return ((data ?? []) as { id: string; name: string; price_food: number }[]).map(
          (one) => ({ id: one.id, name: one.name, price: one.price_food })
        );
      },
      [`counter-index-${counter.kind}`],
      { revalidate: 300, tags: [counter.kind, "menu"] }
    );
    indexBy.set(counter.kind, read);
  }
  return read();
}

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
export async function browseCounter(
  counter: Counter,
  options: Browse
): Promise<{ products: CounterProduct[]; total: number }> {
  const shop = await counterShop(counter);
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
export async function counterProduct(id: string): Promise<CounterProduct | null> {
  const { data } = await db().from("menu_items").select("*").eq("id", id).maybeSingle();
  return data ? toProduct(data as MenuItem) : null;
}

function toProduct(one: MenuItem): CounterProduct {
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
 * Whether a link points at this counter rather than a restaurant.
 *
 * Asked only when a restaurant page has already failed to find a menu, so
 * the cost is paid on a page that was going to be a not-found anyway.
 */
export async function isCounter(counter: Counter, ref: string): Promise<boolean> {
  const shop = await counterShop(counter);
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
 * Whether any of these products belong to this counter.
 *
 * Asked on the way into an order, because a counter and the menu are two
 * different days and a basket holding both cannot be one delivery.
 */
export async function counterIn(counter: Counter, itemIds: string[]): Promise<boolean> {
  const shop = await counterShop(counter);
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
 * Which counter, if any, these products belong to.
 *
 * The basket needs the answer rather than a yes or no: a cart holding
 * paracetamol has to be sent to the pharmacy checkout, not merely refused
 * at the food one.
 */
export async function counterHolding(itemIds: string[]): Promise<Counter | null> {
  if (itemIds.length === 0) return null;
  for (const counter of Object.values(COUNTERS)) {
    if (await counterIn(counter, itemIds)) return counter;
  }
  return null;
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
  const counter = counterOf(batch);
  if (!counter) return await activeBands();
  return counterBands(counter, await safeSettings());
}

/** Whether this order is a counter's, for wording that would otherwise say food. */
export function isCounterBatch(batch: { kind?: string } | null): boolean {
  return counterOf(batch) !== null;
}

/**
 * Every shelf the counter has, with what is actually on it.
 *
 * Importing a catalogue makes a shelf for every collection it names, and a
 * later import leaves the ones nothing came in for standing there empty. Two
 * counts, because a shelf holds products two ways: the one a product is filed
 * under, and every one it appears on. Empty means both, so nothing is offered
 * for deletion while anything still points at it.
 */
export async function counterShelves(
  counter: Counter
): Promise<{ id: string; name: string; items: number; filed: number }[]> {
  const shop = await counterShop(counter);
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
