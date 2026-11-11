import { cache } from "react";

import { db } from "./supabase";
import { dealLeft, dealLive, dealOff, sellingNow, wasPrice } from "./deals";
import { aislesFrom, NOT_DINNER } from "./aisles";
import { safeSettings } from "./settings";
import { onTheMenu } from "./shelf";
import { pctOf } from "./containers";
import { optionGroupsFor } from "./menu";
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
  /** This thing's own readable address: /p/dominos-pepperoni-pizza. The
   *  uuid where there is no name to use, which is the skincare and pharmacy
   *  shelves and nothing else. */
  href: string;
  name: string;
  description: string;
  price: number;
  /** What it costs on an ordinary day, where this one is on sale. Zero
   *  otherwise, and then nothing is struck out. */
  wasPrice?: number;
  /** How long the sale has left, said the way a deadline is read. */
  dealLeft?: string;
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
  /** Only what a counter has put on sale, biggest saving first unless
   *  somebody has asked for another order. See lib/deals. */
  deals?: boolean;
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
const foodPlaces = cache(async function foodPlaces(
  all = false
): Promise<{ id: string; name: string; slug: string; logoUrl: string; brandHex: string }[]> {
  const { data } = await db()
    .from("restaurants")
    .select("id, name, slug, kind, active, logo_url, brand_hex")
    .order("sort_order", { ascending: true });

  return ((data ?? []) as any[])
    .filter((one) => (all || onTheMenu(one.kind)) && one.active !== false)
    .map((one) => ({
      id: one.id as string,
      name: one.name as string,
      slug: (one.slug as string) ?? "",
      logoUrl: (one.logo_url as string) ?? "",
      brandHex: (one.brand_hex as string) ?? "",
    }));
});

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

  /*
   * Only what is on sale, where that is what was asked for.
   *
   * The end date does the work: a sale is live until the moment the
   * counter said it stops, and after that this list is empty again with
   * nothing to switch off. The cheaper-than-usual half is checked in the
   * code below, because it is one column against another and the database
   * cannot be asked that from here.
   */
  if (options.deals) {
    query = query
      .gt("deal_price", 0)
      .gt("deal_until", new Date().toISOString());
  }

  /*
   * The bare list is the food list.
   *
   * Nothing chosen is where everybody lands, and sorted by what sells it put
   * a packet of sanitary pads between a pizza and a burger. Real stock, a
   * useful thing to be able to buy, and not what a shop puts in the window.
   *
   * So the unfiltered view leaves out the aisles that are not somebody's
   * dinner, and only that view: choose the aisle, choose the shop, or search
   * for it by name and it is all there exactly as before. Nothing is hidden,
   * it just stops being the first thing a hungry person sees.
   *
   * Items filed under nothing stay, because a missing category is a gap in
   * the filing rather than a statement about what the thing is.
   */
  const unfiltered =
    !options.category && !options.aisle && !options.place && !options.query;
  if (unfiltered) {
    const notDinner = ((categories ?? []) as any[])
      .filter((one) => NOT_DINNER.includes(String(one.aisle ?? "").trim()))
      .map((one) => one.id as string);
    if (notDinner.length > 0) {
      query = query.or(
        `category_id.is.null,category_id.not.in.(${notDinner.join(",")})`
      );
    }
  }

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

  /*
   * A page of sales is short enough to sort in the code.
   *
   * Biggest saving first is the order a sale list wants, and it is a sum
   * across two columns rather than a column, so the database cannot order
   * by it. There are tens of these, not thousands, so the whole lot comes
   * back and the paging happens here.
   */
  const { data, count, error } = options.deals
    ? await query
    : await query.range(from, to);
  if (error) return { products: [], total: 0 };

  let rows = (data ?? []) as MenuItem[];
  let found = count ?? 0;
  if (options.deals) {
    rows = rows.filter((one) => dealLive(one));
    if (!options.sort) {
      rows = [...rows].sort((a, b) => dealOff(b) - dealOff(a));
    }
    found = rows.length;
    rows = rows.slice(from, to + 1);
  }

  return {
    products: rows.map((one) => {
      const place = byId.get(one.restaurant_id);
      return {
        id: one.id,
        href: one.slug || one.id,
        name: one.name,
        description: one.description ?? "",
        price: sellingNow(one),
        wasPrice: wasPrice(one),
        dealLeft: dealLeft(one),
        imageUrl: one.image_url ?? "",
        restaurantId: one.restaurant_id,
        restaurant: place?.name ?? "",
        slug: place?.slug ?? "",
        categoryId: one.category_id ?? null,
        category: names.get(one.category_id ?? "") ?? "",
        containerPct: pctOf(one),
      };
    }),
    total: found,
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
 * Names alone, and the whole shelf.
 *
 * The cap started at six hundred, on the reasoning that scoring a few
 * hundred strings is instant and fetching everything would not be. The
 * shop has four thousand names and exactly one of them says Birthday, so
 * a cap of six hundred was a coin toss on whether the suggestion this was
 * written for could appear at all. Four thousand short strings is a small
 * query and scoring them is still instant; the cap is only there so a
 * shop ten times this size degrades rather than stalls.
 */
export async function shelfNames(place?: string, cap = 5000): Promise<string[]> {
  try {
    /*
     * The same shelves the page can actually show.
     *
     * This asked the whole database and the page asks foodPlaces, so it
     * offered somebody searching "curta" an ECO Professional Styling Gel
     * from the skincare shelf: a real product, on a shelf this page does
     * not carry, so tapping it searched for its exact name and found
     * nothing. A suggestion that leads nowhere is worse than none, and it
     * taught somebody the search was broken when it was working.
     */
    const places = await foodPlaces();
    const wanted = place && place.trim() !== ""
      ? places.filter((one) => one.id === place.trim())
      : places;
    if (wanted.length === 0) return [];

    const { data, error } = await db()
      .from("menu_items")
      .select("name")
      .in("restaurant_id", wanted.map((one) => one.id))
      .eq("available", true)
      .gt("price_food", 0)
      .limit(cap);

    if (error) return [];
    return ((data ?? []) as { name?: string }[])
      .map((one) => String(one.name ?? "").trim())
      .filter(Boolean);
  } catch {
    // A suggestion nobody gets is a search that behaves as it always has.
    return [];
  }
}

/**
 * The dishes whose names sound like an occasion.
 *
 * "Birthday Cake Remix" is a tub of ice cream at Cold Stone, and the chat's
 * gift rule is a plain regex that cannot tell that from somebody's actual
 * birthday: a pasted basket with one in it was answered with "who is it
 * going to?" and a box for the recipient's first name, on an order the
 * person was placing for themselves.
 *
 * A handful of rows, asked for by the five words that rule cares about, so
 * the chat can be handed them without reading the whole menu. The rule
 * stays a regex and still works with none of this.
 */
export async function giftyDishes(): Promise<string[]> {
  try {
    const places = await foodPlaces(true);
    if (places.length === 0) return [];

    const { data, error } = await db()
      .from("menu_items")
      .select("name")
      .in("restaurant_id", places.map((one) => one.id))
      .eq("available", true)
      .or(
        [
          "name.ilike.%birthday%",
          "name.ilike.%gift%",
          "name.ilike.%surprise%",
          "name.ilike.%anniversary%",
          "name.ilike.%congratulat%",
        ].join(",")
      )
      .limit(200);

    if (error) return [];
    return [
      ...new Set(
        ((data ?? []) as { name?: string }[])
          .map((one) => String(one.name ?? "").trim())
          .filter((one) => one.length >= 8)
      ),
    ];
  } catch {
    // Without them the rule behaves exactly as it always has.
    return [];
  }
}

/**
 * The cheapest dish in each of the given aisles, over the counters that sell
 * food. Zero where an aisle has nothing on sale, so a caller can leave it out.
 */
/**
 * What a thing "starts from", without the small stuff.
 *
 * A pocket or a sauce can be filed in the same aisle as a whole pizza, and
 * the cheapest of them is not what anybody means by "pizza from". So prices
 * well under the usual one (a rough middle) are left out of the starting
 * figure. Worked out from the prices themselves, so no dish is named.
 */
export function startsFrom(prices: number[]): number {
  const sorted = prices.filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = sorted[Math.floor(sorted.length / 2)];
  return sorted.find((n) => n >= middle * 0.25) ?? sorted[0];
}

export async function aisleFromPrices(aisles: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (aisles.length === 0) return out;
  const places = await foodPlaces();
  if (places.length === 0) return out;

  const { data: cats } = await db()
    .from("menu_categories")
    .select("id, aisle")
    .in("restaurant_id", places.map((one) => one.id))
    .in("aisle", aisles);
  const aisleOf = new Map(
    ((cats ?? []) as { id: string; aisle: string }[]).map((one) => [one.id, String(one.aisle).trim()])
  );
  if (aisleOf.size === 0) return out;

  const { data: items } = await db()
    .from("menu_items")
    .select("category_id, price_food")
    .in("category_id", [...aisleOf.keys()])
    .eq("available", true)
    .gt("price_food", 0)
    .limit(5000);
  const seen: Record<string, number[]> = {};
  for (const row of (items ?? []) as { category_id: string; price_food: number }[]) {
    const aisle = aisleOf.get(row.category_id);
    if (!aisle) continue;
    (seen[aisle] ??= []).push(row.price_food);
  }
  for (const [aisle, prices] of Object.entries(seen)) out[aisle] = startsFrom(prices);
  return out;
}

export type AisleShop = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  brandHex: string;
  /** When it next arrives, said as a pill. Filled in by the picker's route. */
  delivery?: { said: string; today: boolean };
  from: number;
  count: number;
  items: {
    id: string;
    href: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    containerPct: number;
    orderedCount: number;
    /** Its choices can change the price (a size, a bigger pizza), so what is
     *  shown is where it starts, not what it will cost. */
    varies: boolean;
    /** Matches what the tile leads with, so it is shown before the rest. */
    featured: boolean;
  }[];
};

/**
 * Who sells an aisle, and what, for the step-by-step picker on the front page.
 *
 * Shops come back with the one selling the most first, and each shop's dishes
 * with the most ordered first, so "what do you recommend" is the top of the
 * list with no extra rule. Capped per shop: it is a way to choose, and the
 * whole menu is a tap away.
 */
export type KindSource = { aisle?: string; q?: string; category?: string };
export type KindFilter = KindSource & {
  /** Several of them at once: a tile that is rice and chicken, say. */
  sources?: KindSource[];
  /** Only these counters, by name. */
  shops?: string[];
  /** Dishes to lead with: every group must appear in the name or description,
   *  groups joined by + and the choices inside one by /. */
  first?: string;
  /** Every dish at every counter, for "pick another restaurant". */
  all?: boolean;
};

export async function aisleShops(aisle: string, perShop = 40): Promise<AisleShop[]> {
  return kindShops({ aisle }, perShop);
}

/** The same, for a kind of food the shop files by word or by category. */
export async function kindShops(filter: KindFilter, perShop = 40): Promise<AisleShop[]> {
  const everyone = await foodPlaces();
  const only = (filter.shops ?? []).map((one) => one.trim().toLowerCase()).filter(Boolean);
  const places =
    only.length === 0 ? everyone : everyone.filter((one) => only.includes(one.name.toLowerCase()));
  const sources = (filter.sources ?? [{ aisle: filter.aisle, q: filter.q, category: filter.category }]).filter(
    (one) => (one.aisle ?? "").trim() !== "" || (one.q ?? "").trim() !== "" || (one.category ?? "").trim() !== ""
  );
  if (places.length === 0 || (sources.length === 0 && !filter.all)) return [];

  const found = new Map<string, MenuItem>();
  if (filter.all) {
    const { data: rows } = await db()
      .from("menu_items")
      .select("*")
      .in("restaurant_id", places.map((one) => one.id))
      .eq("available", true)
      .gt("price_food", 0)
      .order("ordered_count", { ascending: false })
      .limit(3000);
    for (const row of (rows ?? []) as MenuItem[]) found.set(row.id, row);
  }
  for (const source of sources) {
    const aisle = (source.aisle ?? "").trim();
    const word = (source.q ?? "").trim().replace(/[%_,()]/g, " ").trim();
    const category = (source.category ?? "").trim();

    let query = db()
      .from("menu_items")
      .select("*")
      .in("restaurant_id", places.map((one) => one.id))
      .eq("available", true)
      .gt("price_food", 0);

    if (aisle !== "" || category !== "") {
      let cats = db()
        .from("menu_categories")
        .select("id")
        .in("restaurant_id", places.map((one) => one.id));
      cats = aisle !== "" ? cats.eq("aisle", aisle) : cats.eq("name", category);
      const { data: hit } = await cats;
      const ids = ((hit ?? []) as { id: string }[]).map((one) => one.id);
      if (ids.length === 0) continue;
      query = query.in("category_id", ids);
    } else {
      query = query.ilike("name", `%${word}%`);
    }

    const { data: rows } = await query.limit(2000);
    for (const row of (rows ?? []) as MenuItem[]) found.set(row.id, row);
  }

  const leadGroups = (filter.first ?? "")
    .split("+")
    .map((group) => group.split("/").map((word) => word.trim().toLowerCase()).filter(Boolean))
    .filter((group) => group.length > 0);
  const leads = (row: MenuItem) => {
    if (leadGroups.length === 0) return false;
    const whole = `${row.name} ${row.description ?? ""}`.toLowerCase();
    // "Does not come with chicken" settles it: whatever else the description
    // says about chicken (diced into the rice, say), it is not the meal with
    // chicken, and what follows a negative is not read either.
    if (/\b(does not|doesn't|do not|without|not served with)\b[^.]*/.test(whole)) {
      const denied = whole.match(/\b(?:does not|doesn't|do not|without|not served with)\b[^.]*/g) ?? [];
      const wanted = leadGroups.flat();
      if (denied.some((part) => wanted.some((word) => part.includes(word)))) return false;
    }
    const text = whole.replace(/\b(does not|doesn't|do not|without|not served with)\b[^.]*\.?/g, " ");
    return leadGroups.every((group) => group.some((word) => text.includes(word)));
  };

  // A tile that names what it is (rice and chicken) shows only that: plain
  // rice and plain chicken are other tiles.
  const pool = [...found.values()].filter((row) => leadGroups.length === 0 || leads(row));
  const data = pool.sort(
    (a, b) =>
      Number(leads(b)) - Number(leads(a)) ||
      // What a tile leads with comes cheapest first: somebody looking for
      // rice and chicken wants the least they can spend on it before
      // anything else.
      (leads(a) && leads(b) ? a.price_food - b.price_food : 0) ||
      (b.ordered_count ?? 0) - (a.ordered_count ?? 0) ||
      (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const shops = new Map<string, AisleShop>();
  const prices = new Map<string, number[]>();
  for (const row of (data ?? []) as MenuItem[]) {
    const place = places.find((one) => one.id === row.restaurant_id);
    if (!place) continue;
    const shop =
      shops.get(place.id) ??
      { id: place.id, name: place.name, slug: place.slug, logoUrl: place.logoUrl, brandHex: place.brandHex, from: 0, count: 0, items: [] };
    const price = sellingNow(row);
    shop.count += 1;
    (prices.get(place.id) ?? prices.set(place.id, []).get(place.id)!).push(price);
    if (shop.items.length < perShop) {
      shop.items.push({
        id: row.id,
        href: row.slug || row.id,
        name: row.name,
        description: row.description ?? "",
        price,
        imageUrl: row.image_url ?? "",
        containerPct: pctOf(row),
        orderedCount: row.ordered_count ?? 0,
        varies: false,
        featured: leads(row),
      });
    }
    shops.set(place.id, shop);
  }
  for (const shop of shops.values()) shop.from = startsFrom(prices.get(shop.id) ?? []);

  // Which dishes have a choice that moves the price, so the card can say
  // "from" rather than quote the smallest as if it were the price.
  const kept = [...shops.values()].flatMap((shop) => shop.items);
  const groups = await optionGroupsFor(kept.map((one) => one.id));
  for (const dish of kept) {
    dish.varies = (groups.get(dish.id) ?? []).some((group) =>
      group.options.some((option) => option.priceDelta > 0 || option.asItem)
    );
  }
  // Cheapest way in first, so the shop with the lowest starting price leads.
  const featuredIn = (shop: AisleShop) => shop.items.some((dish) => dish.featured);
  return [...shops.values()].sort(
    (a, b) => Number(featuredIn(b)) - Number(featuredIn(a)) || a.from - b.from
  );
}

/**
 * What goes with what, for the picker's "add chicken?" and "add rice?".
 *
 * A kind is a list of places in the menu to look, the same shape a front
 * page tile uses. Written as data here so a new pairing is a line, and so
 * the picker asks the server rather than carrying menu words of its own.
 */
export const UPSELL_KINDS: Record<string, { label: string; sources: KindSource[] }> = {
  chicken: { label: "chicken", sources: [{ aisle: "Chicken" }] },
  rice: {
    label: "rice",
    sources: [{ aisle: "Rice, pasta & bowls" }, { q: "rice" }, { q: "jollof" }],
  },
  // By section name, as the kitchens file them: a soup is not a swallow.
  soup: { label: "soup", sources: [{ category: "Soups" }] },
  swallow: { label: "swallow", sources: [{ category: "Swallows" }] },
  // Chips go with a burger. "burger" is only here so the picker can tell a
  // burger from anything else; it is never offered.
  side: { label: "side", sources: [{ q: "chips" }, { q: "fries" }] },
  burger: { label: "burger", sources: [{ aisle: "Burgers & wraps" }] },
};
