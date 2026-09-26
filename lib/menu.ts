import { unstable_cache } from "next/cache";
import { onTheMenu } from "./shelf";
import { db } from "./supabase";
import { pctOf } from "./containers";
import type { ItemView, MenuView, OptionGroupView } from "./view";
import type {
  ItemOption,
  MenuCategory,
  MenuItem,
  OptionGroup,
  Restaurant,
} from "./types";

/** The customer menu: active restaurants, their categories, items and choices. */
async function readMenu(): Promise<MenuView[]> {
  const { data: restaurants, error } = await db()
    .from("restaurants")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);

  // Skincare is the same shop on a different day, and two thousand products
  // under the restaurants would bury the food. Filtered here rather than in
  // the query, because a database that has not had the migration yet has no
  // kind column and naming one errors the whole statement.
  const places = ((restaurants ?? []) as Restaurant[]).filter((one) =>
    onTheMenu(one.kind)
  );
  if (places.length === 0) return [];

  const ids = places.map((r) => r.id);
  const [categoryRows, menuItems] = await Promise.all([
    everyRow<MenuCategory>((from, to) =>
      db()
        .from("menu_categories")
        .select("*")
        .in("restaurant_id", ids)
        .order("sort_order")
        .order("id")
        .range(from, to)
    ),
    everyRow<MenuItem>((from, to) =>
      db()
        .from("menu_items")
        .select("*")
        .in("restaurant_id", ids)
        .order("sort_order")
        .order("id")
        .range(from, to)
    ),
  ]);

  const groupsByItem = await optionGroupsFor(menuItems.map((i) => i.id));

  return places.map((restaurant) => ({
    restaurant: {
      id: restaurant.id,
      href: restaurant.slug || restaurant.id,
      name: restaurant.name,
      logoUrl: restaurant.logo_url ?? "",
      bannerUrl: restaurant.banner_url ?? "",
      brandHex: restaurant.brand_hex ?? "",
    },
    categories: categoryRows
      .filter((c) => c.restaurant_id === restaurant.id)
      .map((c) => ({ id: c.id, name: c.name })),
    items: menuItems
      .filter((i) => i.restaurant_id === restaurant.id)
      .map(
        (i): ItemView => ({
          id: i.id,
          name: i.name,
          price: i.price_food,
          available: i.available,
          imageUrl: i.image_url ?? "",
          description: i.description ?? "",
          categoryId: i.category_id ?? null,
          containerPct: pctOf(i),
          groups: groupsByItem.get(i.id) ?? [],
        })
      ),
  }));
}

/** The most rows one request comes back with, whatever it was asked for. */
const PAGE = 1000;

/**
 * Every row a query has, rather than the first thousand of them.
 *
 * The database answers with at most a thousand rows and says nothing about
 * the rest, so a menu that grew past that came back short and silent: two
 * hundred and thirty seven dishes were simply not on the shop, and opening
 * one by its link was a 404 on a dish that plainly exists in admin.
 *
 * Ordered by id as well as by whatever the caller asked for, because rows
 * that tie have no order of their own, and pages taken out of an order that
 * is not total can repeat one row and lose another.
 */
async function everyRow<T>(
  page: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let at = 0; ; at += PAGE) {
    const { data, error } = await page(at, at + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

/**
 * Ids in mouthfuls a query string can hold. A hundred uuids is about four
 * kilobytes, which every layer between here and the database accepts, and it
 * also keeps each answer well under the thousand rows one request returns.
 */
function inBatches(ids: string[], size = 100): string[][] {
  const batches: string[][] = [];
  for (let at = 0; at < ids.length; at += size) batches.push(ids.slice(at, at + size));
  return batches;
}

/** Option groups with their options, keyed by item. */
export async function optionGroupsFor(
  itemIds: string[]
): Promise<Map<string, OptionGroupView[]>> {
  const byItem = new Map<string, OptionGroupView[]>();
  if (itemIds.length === 0) return byItem;

  // One `in()` holding every id on the shop is tens of kilobytes of query
  // string, and the database refuses it. Asking for a whole menu then quietly
  // returned no options at all, so a combo that must ask which drink came
  // through as a plain item at the wrong price. Ask in batches, and let a
  // real failure be a failure rather than an empty answer.
  //
  // Paged as well as batched. A hundred items can ask more than a thousand
  // questions between them, and a hundred groups can hold two thousand
  // choices, and the answer stops at a thousand without saying so: the dish
  // arrives asking which sauce with half the sauces missing.
  const groupRows: OptionGroup[] = [];
  for (const batch of inBatches(itemIds)) {
    groupRows.push(
      ...(await everyRow<OptionGroup>((from, to) =>
        db()
          .from("item_option_groups")
          .select("*")
          .in("menu_item_id", batch)
          .order("sort_order")
          .order("id")
          .range(from, to)
      ))
    );
  }
  if (groupRows.length === 0) return byItem;

  const optionRows: ItemOption[] = [];
  for (const batch of inBatches(groupRows.map((g) => g.id))) {
    optionRows.push(
      ...(await everyRow<ItemOption>((from, to) =>
        db()
          .from("item_options")
          .select("*")
          .in("group_id", batch)
          .order("sort_order")
          .order("id")
          .range(from, to)
      ))
    );
  }

  for (const group of groupRows) {
    const view: OptionGroupView = {
      id: group.id,
      name: group.name,
      required: group.required,
      maxSelect: group.max_select,
      options: optionRows
        .filter((o) => o.group_id === group.id)
        .map((o) => ({
          id: o.id,
          name: o.name,
          priceDelta: o.price_delta,
          available: o.available,
        })),
    };
    byItem.set(group.menu_item_id, [...(byItem.get(group.menu_item_id) ?? []), view]);
  }
  return byItem;
}

/**
 * One restaurant's menu. The restaurant page used to load every restaurant,
 * every item and every option in the system to show one of them, which is why
 * it felt slow to open.
 */
/** A uuid, as opposed to a name somebody can read. */
const looksLikeId = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function readMenuFor(ref: string): Promise<MenuView | null> {
  // By name first, because that is what links say now, and by id as well,
  // because every link ever sent says that and none of them may break.
  const find = (byId: boolean) =>
    db()
      .from("restaurants")
      .select("*")
      .eq(byId ? "id" : "slug", ref)
      .eq("active", true)
      .maybeSingle();

  let { data, error } = looksLikeId(ref) ? await find(true) : await find(false);
  // A database without the column yet answers with an error rather than
  // nothing, and a shop that cannot show a menu because a migration has not
  // been run is worse than one with ugly links.
  if (error && !looksLikeId(ref)) ({ data } = await find(true));

  const restaurant = data as Restaurant | null;
  if (!restaurant) return null;
  // The skincare shelf is not a restaurant page. Two thousand products with
  // a food cart under them is how a cleanser ends up on the afternoon run,
  // priced by the food ladder, arriving on a day nobody said.
  // Our own shelf is not a restaurant page either: it is the cupboard the
  // boxes are packed out of, and it has no front door.
  if (!onTheMenu(restaurant.kind)) return null;
  const restaurantId = restaurant.id;

  const [categoryRows, menuItems] = await Promise.all([
    everyRow<MenuCategory>((from, to) =>
      db()
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order")
        .order("id")
        .range(from, to)
    ),
    everyRow<MenuItem>((from, to) =>
      db()
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order")
        .order("id")
        .range(from, to)
    ),
  ]);

  const groupsByItem = await optionGroupsFor(menuItems.map((i) => i.id));

  return {
    restaurant: {
      id: restaurant.id,
      href: restaurant.slug || restaurant.id,
      name: restaurant.name,
      logoUrl: restaurant.logo_url ?? "",
      bannerUrl: restaurant.banner_url ?? "",
      brandHex: restaurant.brand_hex ?? "",
    },
    categories: categoryRows.map((c) => ({ id: c.id, name: c.name })),
    items: menuItems.map(
      (i): ItemView => ({
        id: i.id,
        name: i.name,
        price: i.price_food,
        available: i.available,
        imageUrl: i.image_url ?? "",
        description: i.description ?? "",
        categoryId: i.category_id ?? null,
          containerPct: pctOf(i),
        groups: groupsByItem.get(i.id) ?? [],
      })
    ),
  };
}

/** Just the names, for the navigation bar. Never throws during a build. */
export async function openRestaurants(): Promise<
  { id: string; name: string; href: string }[]
> {
  // The column list is decided at run time, so the query builder cannot know
  // the shape and neither can the types. The rows are read defensively below.
  const read = (columns: string) =>
    db()
      .from("restaurants")
      .select(columns)
      .eq("active", true)
      .order("sort_order")
      .order("name")
      .overrideTypes<{ id: string; name: string; slug?: string | null; kind?: string }[]>();

  try {
    // Every column this wants, then fewer, then fewest. A database that has
    // not had a migration run does not have the column, and naming one it
    // does not have errors the whole statement rather than that one field.
    let { data, error } = await read("id, name, slug, kind");
    if (error) ({ data, error } = await read("id, name, slug"));
    if (error) ({ data } = await read("id, name"));

    return (data ?? [])
      // The skincare shelf is not a restaurant somebody forgot the drinks
      // from. It has its own page, its own basket and its own day.
      .filter((one) => onTheMenu(one.kind))
      .map((one) => ({
        id: one.id,
        name: one.name,
        href: one.slug || one.id,
      }));
  } catch {
    return [];
  }
}


/**
 * The menu, read once a minute rather than once a visitor.
 *
 * Nine restaurants and getting on for eight hundred items is a lot to fetch
 * and a lot to send, and it is the same for everybody. Admin clears this the
 * moment anything changes, so the minute only ever covers a stretch where
 * nothing has.
 */
export const menuView = unstable_cache(readMenu, ["menu-view"], {
  revalidate: 60,
  tags: ["menu"],
});

export const menuViewFor = unstable_cache(readMenuFor, ["menu-view-for"], {
  revalidate: 60,
  tags: ["menu"],
});

/**
 * What everything costs right now, by id.
 *
 * A cart keeps the price a thing had when it went in, which is the right
 * way round for an order already placed and the wrong way round for a
 * basket somebody left open for a week. A cart saved while a menu was
 * half imported still showed nothing at all, and the first honest number
 * anybody saw was at the checkout, where the server prices it properly.
 *
 * Two small maps rather than the whole menu: ids and numbers, a few
 * kilobytes, enough to put a stale basket right before anybody is
 * surprised by it.
 */
async function readPrices(): Promise<{
  item: Record<string, number>;
  option: Record<string, number>;
}> {
  const item: Record<string, number> = {};
  const option: Record<string, number> = {};

  try {
    const items = await everyRow<{ id: string; price_food: number }>((from, to) =>
      db().from("menu_items").select("id, price_food").order("id").range(from, to)
    );
    for (const one of items) item[one.id] = one.price_food ?? 0;

    const options = await everyRow<{ id: string; price_delta: number }>((from, to) =>
      db().from("item_options").select("id, price_delta").order("id").range(from, to)
    );
    for (const one of options) option[one.id] = one.price_delta ?? 0;
  } catch {
    // A cart that cannot be checked is left exactly as it is. The server
    // prices the order either way, so nobody is charged the wrong thing.
    return { item: {}, option: {} };
  }

  return { item, option };
}

export const livePrices = unstable_cache(readPrices, ["live-prices"], {
  revalidate: 60,
  tags: ["menu"],
});
