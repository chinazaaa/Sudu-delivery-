import { db } from "./supabase";
import { onTheMenu } from "./shelf";

/**
 * The shop as it actually is, counted.
 *
 * Written for a shop with twenty-nine paid orders on it, which is the fact
 * that decides the shape of everything here. At that size a conversion
 * rate is a coin toss with a decimal point on it, a top-ten list is most
 * of the list, and a cohort is four people. What is worth having instead
 * is the whole of a short thing: every counter, every item that has ever
 * sold, every customer. Nobody has to be told which ten matter when there
 * are only twenty.
 *
 * So nothing here is a sample or a ranking cut at ten. It is the lot, and
 * the only numbers are ones somebody could check by hand.
 */

/** What one counter has done, and how much of it is standing idle. */
export type CounterLine = {
  id: string;
  name: string;
  /** Orders that touched it in the window, and what went over its counter. */
  orders: number;
  spend: number;
  /** How many things it sold, and how many different things. */
  qty: number;
  kinds: number;
  /** Everything on its shelf, and how much of that has ever sold at all.
   *  All time, not the window: a thing that sold once in May is a thing
   *  that sells, and a thing that has never sold is the question. */
  onSale: number;
  everSold: number;
  lastAt: string | null;
};

export type ShopPicture = {
  counters: CounterLine[];
  /** Across every counter: what is on sale, and how much of it has ever
   *  been bought by anybody. The one number this shop should look at. */
  onSale: number;
  everSold: number;
};

const EMPTY: ShopPicture = { counters: [], onSale: 0, everSold: 0 };

/**
 * Every counter, with what it sold and what it is carrying.
 *
 * The catalogue sizes are counted by the database rather than by reading
 * the items and measuring the pile: PostgREST hands back a thousand rows,
 * and a shelf of two thousand products would quietly report as one.
 */
export async function shopPicture(days = 90): Promise<ShopPicture> {
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  try {
    const { data: shopRows, error: shopError } = await db()
      .from("restaurants")
      .select("id, name, kind, active")
      .order("name");
    if (shopError) throw new Error(shopError.message);

    const shops = ((shopRows ?? []) as {
      id: string;
      name: string;
      kind?: string;
      active: boolean;
    }[]).filter((one) => one.active && onTheMenu(one.kind));
    if (shops.length === 0) return EMPTY;

    // Which counter each item belongs to, for the items that have sold.
    // Read off the sold lines rather than the catalogue, which is four
    // thousand rows and would be a page of its own to fetch.
    const { data: lineRows } = await db()
      .from("order_items")
      .select(
        "menu_item_id, qty, unit_price_at_order, orders!inner(id, status, created_at)"
      )
      .not("orders.status", "in", "(refunded,cancelled)")
      .neq("orders.status", "pending")
      .limit(10_000);

    type Line = {
      menu_item_id: string;
      qty: number | null;
      unit_price_at_order: number | null;
      orders: { id: string; status: string; created_at: string } | null;
    };
    const lines = (lineRows ?? []) as unknown as Line[];

    const soldIds = [...new Set(lines.map((one) => one.menu_item_id))];
    const whose = new Map<string, string>();
    if (soldIds.length > 0) {
      const { data: itemRows } = await db()
        .from("menu_items")
        .select("id, restaurant_id")
        .in("id", soldIds);
      for (const one of (itemRows ?? []) as { id: string; restaurant_id: string }[]) {
        whose.set(one.id, one.restaurant_id);
      }
    }

    // Counted by the database, one number per counter.
    const sizes = await Promise.all(
      shops.map(async (shop) => {
        const { count } = await db()
          .from("menu_items")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", shop.id)
          .eq("available", true);
        return [shop.id, count ?? 0] as const;
      })
    );
    const sizeOf = new Map(sizes);

    const counters: CounterLine[] = shops.map((shop) => {
      const mine = lines.filter((one) => whose.get(one.menu_item_id) === shop.id);
      const inWindow = mine.filter(
        (one) => one.orders !== null && one.orders.created_at >= since
      );
      const orders = new Set(inWindow.map((one) => one.orders!.id));
      return {
        id: shop.id,
        name: shop.name,
        orders: orders.size,
        spend: inWindow.reduce(
          (sum, one) => sum + Number(one.qty ?? 0) * Number(one.unit_price_at_order ?? 0),
          0
        ),
        qty: inWindow.reduce((sum, one) => sum + Number(one.qty ?? 0), 0),
        kinds: new Set(inWindow.map((one) => one.menu_item_id)).size,
        onSale: sizeOf.get(shop.id) ?? 0,
        // All time, on purpose: a thing that sold once in May sells.
        everSold: new Set(mine.map((one) => one.menu_item_id)).size,
        lastAt: mine.reduce<string | null>(
          (latest, one) =>
            one.orders && (latest === null || one.orders.created_at > latest)
              ? one.orders.created_at
              : latest,
          null
        ),
      };
    });

    return {
      counters: counters.sort((a, b) => b.spend - a.spend || b.orders - a.orders),
      onSale: counters.reduce((sum, one) => sum + one.onSale, 0),
      everSold: counters.reduce((sum, one) => sum + one.everSold, 0),
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Who the customers are, all of them.
 *
 * Twenty people have ever paid this shop. A page that tells somebody the
 * repeat rate is 25% is telling them "five of them came back" in a way
 * that cannot be acted on: you cannot ring a percentage. So the figures
 * are counts and the counts come with the names.
 *
 * Quiet is the one that earns its place. Somebody who ordered three times
 * and has not been seen for a month has not churned, they have got busy,
 * and at this size that is a message rather than a strategy.
 */
export type CustomerPicture = {
  /** Everybody who has ever paid for anything. */
  all: number;
  /** More than one order, ever. */
  repeat: number;
  /** First order inside the window. */
  fresh: number;
  /** Ordered before, nothing since the quiet line. Worth a message. */
  quiet: { name: string; phone: string; orders: number; spend: number; lastAt: string }[];
  /** Most spent first, the whole list: at twenty people it is a page. */
  best: { name: string; phone: string; orders: number; spend: number; lastAt: string | null }[];
  /** What an order is worth, and what a customer is worth over everything
   *  they have ever ordered. */
  perOrder: number;
  perCustomer: number;
};

export const QUIET_AFTER_DAYS = 30;

export async function customerPicture(
  days = 90,
  quietAfter = QUIET_AFTER_DAYS
): Promise<CustomerPicture> {
  const empty: CustomerPicture = {
    all: 0,
    repeat: 0,
    fresh: 0,
    quiet: [],
    best: [],
    perOrder: 0,
    perCustomer: 0,
  };

  try {
    const { data, error } = await db()
      .from("orders")
      .select("customer_phone, customer_name, total, status, created_at")
      .limit(10_000);
    if (error) throw new Error(error.message);

    const rows = ((data ?? []) as {
      customer_phone: string;
      customer_name: string;
      total: number | null;
      status: string;
      created_at: string;
    }[]).filter(
      (one) => !["refunded", "cancelled", "pending"].includes(one.status)
    );
    if (rows.length === 0) return empty;

    const by = new Map<
      string,
      { name: string; phone: string; orders: number; spend: number; lastAt: string; firstAt: string }
    >();
    for (const row of rows) {
      const was = by.get(row.customer_phone);
      if (!was) {
        by.set(row.customer_phone, {
          name: row.customer_name,
          phone: row.customer_phone,
          orders: 1,
          spend: Number(row.total ?? 0),
          lastAt: row.created_at,
          firstAt: row.created_at,
        });
        continue;
      }
      was.orders += 1;
      was.spend += Number(row.total ?? 0);
      if (row.created_at > was.lastAt) {
        was.lastAt = row.created_at;
        // The newest name they gave, which is the one they answer to.
        was.name = row.customer_name;
      }
      if (row.created_at < was.firstAt) was.firstAt = row.created_at;
    }

    const everybody = [...by.values()];
    const since = new Date(Date.now() - days * 86400_000).toISOString();
    const quietLine = new Date(Date.now() - quietAfter * 86400_000).toISOString();
    const spend = everybody.reduce((sum, one) => sum + one.spend, 0);

    return {
      all: everybody.length,
      repeat: everybody.filter((one) => one.orders > 1).length,
      fresh: everybody.filter((one) => one.firstAt >= since).length,
      quiet: everybody
        .filter((one) => one.lastAt < quietLine)
        .sort((a, b) => b.spend - a.spend)
        .map(({ name, phone, orders, spend: theirs, lastAt }) => ({
          name,
          phone,
          orders,
          spend: theirs,
          lastAt,
        })),
      best: everybody
        .sort((a, b) => b.spend - a.spend || b.orders - a.orders)
        .map(({ name, phone, orders, spend: theirs, lastAt }) => ({
          name,
          phone,
          orders,
          spend: theirs,
          lastAt,
        })),
      perOrder: Math.round(spend / rows.length),
      perCustomer: Math.round(spend / everybody.length),
    };
  } catch {
    return empty;
  }
}

/**
 * What people typed when the list had nothing that fitted.
 *
 * The dropdown at the checkout offers a promoter or two and a channel, and
 * everybody else lands on "Somewhere else". Those are most people, and at
 * a university almost every real answer is a sentence rather than an
 * option: a roommate, a group chat, a poster in a block.
 *
 * Their words exactly, with the name of whoever said it, because at twenty
 * customers the useful form of this is a short list somebody reads, not a
 * tally of categories somebody invented beforehand.
 */
export async function whatTheySaid(): Promise<
  { name: string; phone: string; said: string }[]
> {
  try {
    const { data, error } = await db()
      .from("customers")
      .select("name, phone, heard_said")
      .neq("heard_said", "")
      .limit(500);
    if (error) throw new Error(error.message);
    return ((data ?? []) as { name: string; phone: string; heard_said: string }[])
      .map((one) => ({
        name: one.name,
        phone: one.phone,
        said: String(one.heard_said ?? "").trim(),
      }))
      .filter((one) => one.said !== "");
  } catch {
    // The column is not there yet, which is not the same as nobody having
    // answered: the page is better without the panel than without the page.
    return [];
  }
}
