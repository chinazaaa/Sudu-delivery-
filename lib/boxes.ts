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
  active: boolean;
  sort_order: number;
};

export type Occasion = {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  image_url: string;
  /** Set means a time everybody shares, like a kick-off. Null means they
   *  pick a day from whatever is going. */
  happens_at: string | null;
  /** What that time is called, so the copy reads like a person wrote it. */
  when_word: string;
  batch_id: string | null;
  closes_at: string | null;
  active: boolean;
  sort_order: number;
};

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
  is_extra: Boolean(row.is_extra),
  lines: readLines(row.lines),
  active: row.active !== false,
  sort_order: Number(row.sort_order ?? 100),
});

const toOccasion = (row: Record<string, unknown>): Occasion => ({
  id: row.id as string,
  slug: (row.slug as string) ?? "",
  name: (row.name as string) ?? "",
  blurb: (row.blurb as string) ?? "",
  image_url: (row.image_url as string) ?? "",
  happens_at: (row.happens_at as string) ?? null,
  when_word: (row.when_word as string) || "it starts",
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
