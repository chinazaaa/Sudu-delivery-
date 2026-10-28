import { db } from "./supabase";
import type { CartLine } from "./types";

/**
 * A basket somebody else already filled.
 *
 * The whole idea is that nobody chooses. "Two large pizzas, wings and four
 * drinks, ₦32,900" is an answer; a menu is a question, and at five o'clock
 * on a Saturday nobody wants another question. So a box settles what is in
 * it, what it costs, and what delivery costs, and leaves exactly one thing
 * open: when they want it.
 *
 * Swaps exist for the person who would otherwise leave. Three alternatives
 * on a line, not the menu, because the moment a box can be anything it is
 * a menu again.
 */
export type BoxSwap = {
  menu_item_id: string;
  option_ids: string[];
};

export type BoxLine = {
  /** Its own id, so reordering the list cannot move somebody's swaps onto
   *  another dish. */
  id: string;
  menu_item_id: string;
  option_ids: string[];
  qty: number;
  swaps: BoxSwap[];
  /**
   * What to call this line instead of whatever item is under it.
   *
   * A box that says "a large pizza, pick your own" still has to hold a real
   * item, because a price comes off an item and the counter has to be told
   * what to buy. Without this the shelf named that item, so a box meant to
   * offer any large pizza announced itself as Extravaganza and read as a
   * box of Extravaganza with the rest hidden behind a swap.
   *
   * Empty for nearly every line: a box of a particular thing should say
   * what that thing is.
   */
  as?: string;
};

export type Box = {
  id: string;
  occasion_id: string;
  name: string;
  blurb: string;
  serves: string;
  image_url: string;
  /** Flat delivery either way. The container ladder would price a box for
   *  five out of existence: eight containers is eight thousand. */
  run_fee: number;
  car_fee: number;
  /** Rides the same car as a box rather than being one: pudding, not dinner. */
  is_extra: boolean;
  lines: BoxLine[];
  /**
   * Sold as one package, at this price, delivery already in it.
   *
   * A hamper is not a shopping list with a total under it. The shops sell
   * one at a price they chose, and the contents are a description rather
   * than a receipt: fifty thousand naira of hamper, and what is in it reads
   * the way the shop wants it to read. Pricing a hamper off thirty-eight
   * ticked menu lines meant the price moved every time a tin of milk did,
   * and changing what it says meant finding thirty-eight products.
   *
   * Null is every other box, priced off the menu exactly as before. A
   * package still carries one hidden line so that an order has something
   * in it; nobody sees that line.
   */
  package_price: number | null;
  /** What is in a package, one per line, in the shop's own words. */
  contents: string[];
  active: boolean;
  sort_order: number;
  /** What to put in the "want it changed?" box, for this box. Empty means
   *  the shelf's own suggestion, which is right until two boxes on one shelf
   *  want different advice. */
  custom_hint: string;
};

/**
 * Which shelf a set of boxes sits on.
 *
 * An occasion is a date somebody is shopping for: a birthday, a match, a
 * games night. It passes, and then it should not be on the page.
 *
 * A collection is a standing shelf: care packages, hostel packs, a restock.
 * It is there all term, and calling it an occasion was the thing that made
 * the word stop meaning anything.
 */
export type Shelf = "collection" | "occasion";

export type Occasion = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  image_url: string;
  /** Set means a time everybody shares, like a kick-off. Null means they
   *  pick a day from whatever is going. */
  happens_at: string | null;
  /**
   * The first day this shelf will deliver on, where it has a season rather
   * than a deadline.
   *
   * A Christmas hamper is bought in November and wanted in December, and
   * the picker was offering the runs going out this week because those are
   * the ones that exist. A shelf with a start offers a plain date between
   * that day and `happens_at` instead: no runs, no windows, because a
   * hamper is found, packed and then carried, and which car it rides in is
   * the shop's business rather than the buyer's.
   *
   * Null on everything else, which keeps every other shelf exactly as it
   * was.
   */
  starts_at: string | null;
  /** Which of the two shelves it is on. */
  kind: Shelf;
  /** The example in the "want it changed?" box. One example cannot serve a
   *  cake and a bucket, so each shelf carries its own. */
  custom_hint: string;
  /** What that time is called, so the copy reads like a person wrote it. */
  when_word: string;
  /** What one of the things on this shelf is called, singular: "hamper" on
   *  the Christmas shelf, "box" everywhere else. Said in admin rather than
   *  guessed from the name, because a page that calls a hamper a box reads
   *  as somebody else's shop. */
  item_word: string;
  /** The small word on this shelf's card: "This term", "Matchday", "New".
   *  Empty means the card says whatever its date says, or nothing. */
  tag: string;
  batch_id: string | null;
  closes_at: string | null;
  active: boolean;
  sort_order: number;
};

/** The ones on one shelf, in the order they were already in. */
export function onShelf(all: Occasion[], kind: Shelf | "all"): Occasion[] {
  // "all" is the public shelf: one page holding both kinds, because one
  // address is the one somebody can put on a flyer. The two kinds still
  // exist in admin, where the difference between a thing with a date and a
  // thing without one is worth keeping.
  return kind === "all" ? all : all.filter((one) => one.kind === kind);
}

/** Whether this occasion has a time of its own that everybody shares. */
export function isTimed(occasion: Occasion): boolean {
  return Boolean(occasion.happens_at);
}

/**
 * Read a box's lines out of the database without trusting their shape.
 *
 * It is JSON in a column, so it can be anything, and a malformed row must
 * leave a box empty rather than take a page down. A line with no item is
 * not a line.
 */
export function readLines(raw: unknown): BoxLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((one, index) => {
    const line = one as Partial<BoxLine>;
    const itemId = typeof line?.menu_item_id === "string" ? line.menu_item_id : "";
    if (!itemId) return [];

    const qty = Number(line.qty);
    return [
      {
        id: typeof line.id === "string" && line.id !== "" ? line.id : `l${index}`,
        menu_item_id: itemId,
        option_ids: ids(line.option_ids),
        qty: Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 1,
        as: typeof line.as === "string" ? line.as.trim() : "",
        swaps: Array.isArray(line.swaps)
          ? line.swaps.flatMap((swap) => {
              const id = typeof swap?.menu_item_id === "string" ? swap.menu_item_id : "";
              return id ? [{ menu_item_id: id, option_ids: ids(swap.option_ids) }] : [];
            })
          : [],
      },
    ];
  });
}

/** What is in a package, as the lines somebody typed. Blank lines dropped,
 *  because a stray return is not an item. */
export const readContents = (raw: unknown): string[] =>
  String(raw ?? "")
    .split("\n")
    .map((one) => one.trim())
    .filter((one) => one !== "");

const ids = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((one): one is string => typeof one === "string") : [];

const toBox = (row: Record<string, unknown>): Box => ({
  id: row.id as string,
  occasion_id: row.occasion_id as string,
  name: (row.name as string) ?? "",
  blurb: (row.blurb as string) ?? "",
  serves: (row.serves as string) ?? "",
  image_url: (row.image_url as string) ?? "",
  run_fee: Number(row.run_fee ?? 0),
  car_fee: Number(row.car_fee ?? 0),
  package_price:
    row.package_price === null || row.package_price === undefined
      ? null
      : Number(row.package_price),
  contents: readContents(row.contents),
  is_extra: Boolean(row.is_extra),
  lines: readLines(row.lines),
  active: row.active !== false,
  sort_order: Number(row.sort_order ?? 100),
  custom_hint: (row.custom_hint as string) ?? "",
});

const toOccasion = (row: Record<string, unknown>): Occasion => ({
  id: row.id as string,
  slug: (row.slug as string) ?? "",
  name: (row.name as string) ?? "",
  blurb: (row.blurb as string) ?? "",
  image_url: (row.image_url as string) ?? "",
  happens_at: (row.happens_at as string) ?? null,
  starts_at: (row.starts_at as string) ?? null,
  /* A database that has not had the migration run yet has no column here,
     and a clock of its own is the next best evidence of which it is. */
  kind: row.kind === "occasion" || row.kind === "collection"
    ? (row.kind as Shelf)
    : row.happens_at
      ? "occasion"
      : "collection",
  custom_hint: (row.custom_hint as string) ?? "",
  when_word: (row.when_word as string) || "it starts",
  item_word: ((row.item_word as string) ?? "").trim() || "box",
  tag: ((row.tag as string) ?? "").trim(),
  batch_id: (row.batch_id as string) ?? null,
  closes_at: (row.closes_at as string) ?? null,
  active: row.active !== false,
  sort_order: Number(row.sort_order ?? 100),
});

/**
 * Every occasion worth showing, soonest first.
 *
 * A timed occasion that has already happened is gone: a page offering food
 * for last Saturday's match is worse than a page with nothing on it. One
 * with no time of its own never goes stale, so it simply stays.
 *
 * Asked in a way that survives a database which has not had the migration
 * run yet, because this is the home page and it must never be the thing
 * that takes the shop down.
 */
export async function liveOccasions(): Promise<Occasion[]> {
  const { data, error } = await db()
    .from("occasions")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];

  const now = Date.now();
  return (data ?? [])
    .map((row) => toOccasion(row as Record<string, unknown>))
    .filter((one) => !one.happens_at || new Date(one.happens_at).getTime() > now)
    .sort(bySoonest);
}

/** Timed ones first and soonest first, then the standing ones in their order. */
function bySoonest(a: Occasion, b: Occasion): number {
  if (a.happens_at && b.happens_at) {
    return new Date(a.happens_at).getTime() - new Date(b.happens_at).getTime();
  }
  if (a.happens_at) return -1;
  if (b.happens_at) return 1;
  return a.sort_order - b.sort_order;
}

export async function occasionBySlug(slug: string): Promise<Occasion | null> {
  const { data, error } = await db()
    .from("occasions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return toOccasion(data as Record<string, unknown>);
}

/**
 * Every live box across several occasions, in one go.
 *
 * The list page asked per occasion, which was nine round trips to London to
 * draw nine cards. One query answers all of them and the page sorts them
 * out itself.
 */
export async function boxesAcross(occasionIds: string[]): Promise<Box[]> {
  if (occasionIds.length === 0) return [];
  const { data, error } = await db()
    .from("boxes")
    .select("*")
    .in("occasion_id", occasionIds)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => toBox(row as Record<string, unknown>));
}

export async function boxesOf(occasionId: string): Promise<Box[]> {
  const { data, error } = await db()
    .from("boxes")
    .select("*")
    .eq("occasion_id", occasionId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []).map((row) => toBox(row as Record<string, unknown>));
}

export async function boxById(id: string): Promise<Box | null> {
  const { data, error } = await db().from("boxes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return toBox(data as Record<string, unknown>);
}

/**
 * A box as a cart, with any swaps the customer chose applied.
 *
 * `chosen` maps a line's id to the index of the swap they picked, which is
 * what a form sends back. An index that is not there leaves the line as the
 * shop set it, because a box with a hole in it is not a box.
 */
export function cartOf(box: Box, chosen: Record<string, number> = {}): CartLine[] {
  return box.lines.map((line) => {
    const pick = chosen[line.id];
    const swap =
      typeof pick === "number" && pick >= 0 && pick < line.swaps.length
        ? line.swaps[pick]
        : null;

    return {
      menu_item_id: swap ? swap.menu_item_id : line.menu_item_id,
      option_ids: swap ? swap.option_ids : line.option_ids,
      qty: line.qty,
    };
  });
}

/**
 * Which shelf a box came off, and what it was called.
 *
 * An order that was a box is not a cart: its price is the box's price with
 * delivery already in it, and throwing its contents back into an ordinary
 * cart would charge the container ladder for a thing that was never priced
 * that way. So "want this again" on a box has to go back to the box.
 */
export async function boxWhere(
  boxId: string
): Promise<{ name: string; href: string; slug: string } | null> {
  const { data: box } = await db()
    .from("boxes")
    .select("name, occasion_id, active")
    .eq("id", boxId)
    .maybeSingle();
  const row = box as { name?: string; occasion_id?: string; active?: boolean } | null;
  if (!row?.occasion_id || row.active === false) return null;

  const { data: shelf } = await db()
    .from("occasions")
    .select("slug, kind, active")
    .eq("id", row.occasion_id)
    .maybeSingle();
  const on = shelf as { slug?: string; kind?: string; active?: boolean } | null;
  if (!on?.slug || on.active === false) return null;

  return {
    name: row.name ?? "that box",
    href: `/${on.kind === "occasion" ? "occasions" : "collections"}/${on.slug}`,
    // The app files both kinds under one route, so it wants the slug on its
    // own rather than the website's two-worded path.
    slug: on.slug,
  };
}
