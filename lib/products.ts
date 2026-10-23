import { db } from "./supabase";
import { aislesFrom } from "./aisles";
import { safeSettings } from "./settings";
import { onTheMenu } from "./shelf";
import { pctOf } from "./containers";
import type { MenuItem } from "./types";

/**
 * Everything the shop sells, in one list.
 *
 * The home page is a row of restaurants, which is the right shape for
 * somebody who has decided where they want food from and no use at all to
 * somebody who has decided what they want to eat. Wings are wings whether
 * KFC or Domino's made them, and until now finding them meant opening four
 * menus and remembering the prices.
 *
 * Asked of the database rather than read whole and filtered here, for the
 * same reason the skincare shelf is: seven hundred dishes down a phone line
 * to show somebody twenty four is a page that never loads.
 */
export const PER_PAGE = 24;

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  restaurantId: string;
  restaurant: string;
  /** The restaurant's own web address, so a card can open its menu. */
  slug: string;
  categoryId: string | null;
  category: string;
  /** How much of the car it takes. Carried so a card on this page can put
   *  the thing straight in the cart and have the fee come out right. */
  containerPct: number;
};

export type Browse = {
  query?: string;
  /** A restaurant id. */
  place?: string;
  /** A category name rather than an id, because the same word names a
   *  different row at every restaurant: "Drinks" at Domino's and "Drinks"
   *  at KFC are two ids and one idea. */
  category?: string;
  /** One of the shop's own aisles, which is how the whole list is browsed:
   *  the kitchens' own words are their filing, not a way in. */
  aisle?: string;
  sort?: "" | "az" | "cheap" | "dear";
  page?: number;
  /** Everything up to and including this page, rather than this page on its
   *  own. What "show more" means. */
  upTo?: boolean;
  /** Include the shelves that are not food. */
  all?: boolean;
};

export type Facets = {
  places: { id: string; name: string }[];
  categories: string[];
  /** The aisles that actually have something in them, in the shop's own
   *  order. Only for the whole list: with one kitchen chosen its own
   *  sections are better, because they are what its menu says. */
  aisles: string[];
};

/**
 * The food restaurants, which is everything but the skincare shelf.
 *
 * `all` keeps the shelf in. The one list is a food list because somebody
 * browsing it is hungry, but somebody picking a Christmas present is not,
 * and skincare is the most giftable thing in the shop.
 */
async function foodPlaces(all = false): Promise<{ id: string; name: string; slug: string }[]> {
  const { data } = await db()
    .from("restaurants")
    .select("id, name, slug, kind, active")
    .order("sort_order", { ascending: true });

  return ((data ?? []) as any[])
    .filter((one) => (all || onTheMenu(one.kind)) && one.active !== false)
    .map((one) => ({
      id: one.id as string,
      name: one.name as string,
      slug: (one.slug as string) ?? "",
    }));
}

/**
 * What there is to narrow by.
 *
 * Categories are gathered by name and counted, and the thin ones are left
 * out: a row of forty is a row nobody reaches the end of, and a category
 * with two things in it is not a way of finding anything.
 */
export async function productFacets(place?: string, all = false): Promise<Facets> {
  const places = await foodPlaces(all);
  if (places.length === 0) return { places: [], categories: [], aisles: [] };

  // With a restaurant chosen, its own categories, in its own order. Without
  // one, the words more than one restaurant uses, because across the whole
  // shop those are the ideas and the rest is one kitchen's filing.
  const scope = place ? places.filter((one) => one.id === place) : places;

  const { data } = await db()
    .from("menu_categories")
    .select("name, aisle, restaurant_id, sort_order")
    .in("restaurant_id", scope.map((one) => one.id))
    .order("sort_order", { ascending: true });

  const rows = (data ?? []) as any[];

  if (place) {
    const kept: string[] = [];
    for (const row of rows) {
      const name = String(row.name ?? "").trim();
      if (name !== "" && !kept.includes(name)) kept.push(name);
    }
    return {
      places: places.map(({ id, name }) => ({ id, name })),
      categories: kept,
      aisles: [],
    };
  }

  /*
   * The aisles, in the shop's own order, and only the ones with something
   * in them.
   *
   * Not the kitchens' own words counted and cut off at twenty-four, which
   * is what this used to be: a row where Burgers sat beside Burgers &
   * sandwiches, where Deal and Add-ons and BK Jollof Rice were offered to
   * students as ways of finding dinner, and where which twenty-four you
   * got depended on how many kitchens happened to use the same word.
   */
  const filed = new Set<string>();
  for (const row of rows) {
    const aisle = String(row.aisle ?? "").trim();
    if (aisle !== "") filed.add(aisle);
  }

  return {
    places: places.map(({ id, name }) => ({ id, name })),
    categories: [],
    aisles: aislesFrom((await safeSettings()).menu_aisles).filter((one) =>
      filed.has(one)
    ),
  };
}

export async function browseProducts(
  options: Browse
): Promise<{ products: Product[]; total: number }> {
  const places = await foodPlaces(options.all === true);
  if (places.length === 0) return { products: [], total: 0 };

  const wanted = options.place
    ? places.filter((one) => one.id === options.place)
    : places;
  if (wanted.length === 0) return { products: [], total: 0 };

  const byId = new Map(wanted.map((one) => [one.id, one]));

  // A category is chosen by name, so it has to be turned back into every id
  // that word stands for across the restaurants in scope.
  let categoryIds: string[] | null = null;
  const names = new Map<string, string>();

  const { data: categories } = await db()
    .from("menu_categories")
    .select("id, name, aisle, restaurant_id")
    .in("restaurant_id", wanted.map((one) => one.id));

  for (const row of (categories ?? []) as any[]) {
    names.set(row.id as string, String(row.name ?? ""));
  }

  if (options.category) {
    categoryIds = ((categories ?? []) as any[])
      .filter((one) => String(one.name ?? "").trim() === options.category)
      .map((one) => one.id as string);
    if (categoryIds.length === 0) return { products: [], total: 0 };
  } else if (options.aisle) {
    // An aisle is one word over every kitchen's own filing, so it comes
    // back as every section anybody filed under it.
    categoryIds = ((categories ?? []) as any[])
      .filter((one) => String(one.aisle ?? "").trim() === options.aisle)
      .map((one) => one.id as string);
    if (categoryIds.length === 0) return { products: [], total: 0 };
  }

  const page = Math.max(1, Math.floor(options.page ?? 1));
  // Everything so far, or just this page. "Show more" grows one list rather
  // than turning forty-two pages, and on a phone that is the difference
  // between browsing and filing.
  const from = options.upTo ? 0 : (page - 1) * PER_PAGE;
  const to = page * PER_PAGE - 1;

  let query = db()
    .from("menu_items")
    .select("*", { count: "exact" })
    .in("restaurant_id", wanted.map((one) => one.id))
    .eq("available", true)
    // Nothing without a price. An item at zero is one the importer could not
    // read, not something anybody can buy.
    .gt("price_food", 0);

  if (categoryIds) query = query.in("category_id", categoryIds);
  if (options.query) {
    const words = options.query.trim().replace(/[%,]/g, " ");
    if (words !== "") query = query.ilike("name", `%${words}%`);
  }

  /*
   * What sells, first.
   *
   * A to Z opened the shop with 5 Alive, 7UP and Aquafina: three bottles of
   * drink, on the page where somebody is deciding what to eat. Alphabetical
   * is the one order that carries no information at all.
   *
   * Two tie-breaks under it, because most of a thousand items have never
   * been ordered and would otherwise fall back to the alphabet again. The
   * kitchen's own order comes next, which is the order its menu is printed
   * in and so roughly what it would like you to see; the name is only there
   * to stop the list shuffling between page loads.
   */
  query =
    options.sort === "cheap"
      ? query.order("price_food", { ascending: true })
      : options.sort === "dear"
        ? query.order("price_food", { ascending: false })
        : options.sort === "az"
          ? query.order("name", { ascending: true })
          : query
              .order("ordered_count", { ascending: false })
              .order("sort_order", { ascending: true })
              .order("name", { ascending: true });

  const { data, count, error } = await query.range(from, to);
  if (error) return { products: [], total: 0 };

  return {
    products: ((data ?? []) as MenuItem[]).map((one) => {
      const place = byId.get(one.restaurant_id);
      return {
        id: one.id,
        name: one.name,
        description: one.description ?? "",
        price: one.price_food,
        imageUrl: one.image_url ?? "",
        restaurantId: one.restaurant_id,
        restaurant: place?.name ?? "",
        slug: place?.slug ?? "",
        categoryId: one.category_id ?? null,
        category: names.get(one.category_id ?? "") ?? "",
        containerPct: pctOf(one),
      };
    }),
    total: count ?? 0,
  };
}

/** Kept for the page that wants a number without a page of results. */
export { pctOf };

/**
 * Names on the shelves, for working out what somebody meant.
 *
 * Only ever asked when a search found nothing, which is the one moment the
 * cost of a second query is obviously worth paying: the alternative on
 * screen is a dead end on the page where somebody is trying to spend
 * money.
 *
 * Names alone, and capped. Scoring a few hundred of them against one typo
 * is instant; fetching the whole shop to do it would not be.
 */
export async function shelfNames(place?: string, cap = 600): Promise<string[]> {
  try {
    let ask = db()
      .from("menu_items")
      .select("name, restaurants!inner(name, is_open)")
      .eq("available", true)
      .gt("price_food", 0)
      .limit(cap);

    if (place && place.trim() !== "") {
      ask = ask.eq("restaurants.name", place.trim());
    }

    const { data, error } = await ask;
    if (error) return [];
    return ((data ?? []) as { name?: string }[])
      .map((one) => String(one.name ?? "").trim())
      .filter(Boolean);
  } catch {
    // A suggestion nobody gets is a search that behaves as it always has.
    return [];
  }
}
