import { db } from "./supabase";
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
};

export type Browse = {
  query?: string;
  /** A restaurant id. */
  place?: string;
  /** A category name rather than an id, because the same word names a
   *  different row at every restaurant: "Drinks" at Domino's and "Drinks"
   *  at KFC are two ids and one idea. */
  category?: string;
  sort?: "" | "cheap" | "dear";
  page?: number;
};

export type Facets = {
  places: { id: string; name: string }[];
  categories: string[];
};

/** The food restaurants, which is everything but the skincare shelf. */
async function foodPlaces(): Promise<{ id: string; name: string; slug: string }[]> {
  const { data } = await db()
    .from("restaurants")
    .select("id, name, slug, kind, active")
    .order("sort_order", { ascending: true });

  return ((data ?? []) as any[])
    .filter((one) => one.kind !== "skincare" && one.active !== false)
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
export async function productFacets(place?: string): Promise<Facets> {
  const places = await foodPlaces();
  if (places.length === 0) return { places: [], categories: [] };

  // With a restaurant chosen, its own categories, in its own order. Without
  // one, the words more than one restaurant uses, because across the whole
  // shop those are the ideas and the rest is one kitchen's filing.
  const scope = place ? places.filter((one) => one.id === place) : places;

  const { data } = await db()
    .from("menu_categories")
    .select("name, restaurant_id, sort_order")
    .in("restaurant_id", scope.map((one) => one.id))
    .order("sort_order", { ascending: true });

  const rows = (data ?? []) as any[];

  if (place) {
    const kept: string[] = [];
    for (const row of rows) {
      const name = String(row.name ?? "").trim();
      if (name !== "" && !kept.includes(name)) kept.push(name);
    }
    return { places: places.map(({ id, name }) => ({ id, name })), categories: kept };
  }

  const seen = new Map<string, number>();
  for (const row of rows) {
    const name = String(row.name ?? "").trim();
    if (name === "") continue;
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }

  return {
    places: places.map(({ id, name }) => ({ id, name })),
    categories: [...seen.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name)
      .slice(0, 24),
  };
}

export async function browseProducts(
  options: Browse
): Promise<{ products: Product[]; total: number }> {
  const places = await foodPlaces();
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
    .select("id, name, restaurant_id")
    .in("restaurant_id", wanted.map((one) => one.id));

  for (const row of (categories ?? []) as any[]) {
    names.set(row.id as string, String(row.name ?? ""));
  }

  if (options.category) {
    categoryIds = ((categories ?? []) as any[])
      .filter((one) => String(one.name ?? "").trim() === options.category)
      .map((one) => one.id as string);
    if (categoryIds.length === 0) return { products: [], total: 0 };
  }

  const page = Math.max(1, Math.floor(options.page ?? 1));
  const from = (page - 1) * PER_PAGE;

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

  query =
    options.sort === "cheap"
      ? query.order("price_food", { ascending: true })
      : options.sort === "dear"
        ? query.order("price_food", { ascending: false })
        : query.order("name", { ascending: true });

  const { data, count, error } = await query.range(from, from + PER_PAGE - 1);
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
      };
    }),
    total: count ?? 0,
  };
}

/** Kept for the page that wants a number without a page of results. */
export { pctOf };
