import { unstable_cache } from "next/cache";
import { db } from "./supabase";
/**
 * A counter's own sale, passed through.
 *
 * Black Friday belongs to the restaurants: one does buy one get one free, the
 * next takes a third off a bucket. When a counter cuts its price our cost
 * falls, and the only two things we can do with that are pass it on or keep
 * it. Keeping it is how somebody who has seen the poster decides the shop is
 * expensive, on the one weekend of the year when everybody is comparing. So
 * the deal price is the shop's price, and the markup stays a markup.
 *
 * The ordinary price is never touched. A deal is a second price with an end
 * on it, and when that end passes the ordinary one is simply what is charged
 * again: nothing has to be remembered, restored or tidied up, and there is no
 * night where the counters have gone back to full price and we are still
 * selling at half. That is the whole reason the end date is not optional.
 *
 * Buy one get one free is not a price, so it is not this: it is sold as its
 * own line on the menu, "two for one", priced at one and counted as two in
 * the car. The counter sells it that way and so do we.
 */

/** What a row needs to carry for any of this to be asked of it. */
export type DealRow = {
  price_food: number;
  price_cost?: number | null;
  /** The sale price while it runs. Null or zero means no sale. */
  deal_price?: number | null;
  /** What we pay at the counter while the sale runs, where that has changed
   *  too. Zero means the usual cost still stands: a counter can cut what it
   *  charges us without us cutting what we charge. */
  deal_cost?: number | null;
  /** When it stops. No end, no deal: see above. */
  deal_until?: string | null;
};

/** Whether this row is on sale at a given moment. */
export function dealLive(row: DealRow, now: Date = new Date()): boolean {
  const price = Number(row.deal_price ?? 0);
  const until = (row.deal_until ?? "").trim();
  if (price <= 0 || until === "") return false;
  const ends = new Date(until).getTime();
  if (!Number.isFinite(ends)) return false;
  // Cheaper than the ordinary price or it is not a deal. A "sale" that costs
  // more is somebody typing in the wrong box, and it must not be charged.
  return ends > now.getTime() && price < Number(row.price_food ?? 0);
}

/** What to charge for one of these, this minute. */
export function sellingNow(row: DealRow, now: Date = new Date()): number {
  return dealLive(row, now)
    ? Number(row.deal_price ?? 0)
    : Number(row.price_food ?? 0);
}

/** What it was before the sale, for printing with a line through it. Zero
 *  where there is no sale, so nothing is struck out on an ordinary day. */
export function wasPrice(row: DealRow, now: Date = new Date()): number {
  return dealLive(row, now) ? Number(row.price_food ?? 0) : 0;
}

/** What we pay at the counter for one, this minute. The run sheet and the
 *  profit page both ask, and during a sale the counter charges less. */
export function costNow(row: DealRow, now: Date = new Date()): number {
  const deal = Number(row.deal_cost ?? 0);
  return dealLive(row, now) && deal > 0 ? deal : Number(row.price_cost ?? 0);
}

/** How much off, as a percentage, for the tag on the card. Rounded down, so
 *  a third off never reads as 34%. */
export function dealOff(row: DealRow, now: Date = new Date()): number {
  if (!dealLive(row, now)) return 0;
  const was = Number(row.price_food ?? 0);
  const is = Number(row.deal_price ?? 0);
  if (was <= 0) return 0;
  return Math.floor(((was - is) / was) * 100);
}

/**
 * How long is left, said the way somebody reads a deadline.
 *
 * Days while there are days, hours inside a day, minutes in the last hour.
 * A sale with four minutes left is a different sentence from one with four
 * days left, and "ends 27/11/2026, 23:59" is neither.
 */
export function dealLeft(row: DealRow, now: Date = new Date()): string {
  if (!dealLive(row, now)) return "";
  const ends = new Date(row.deal_until ?? "").getTime();
  const left = ends - now.getTime();
  if (left <= 0) return "";

  const minutes = Math.floor(left / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} left`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} left`;
}

/**
 * Buy one get one free, which is not a price.
 *
 * Domino's does not cut the price of a pizza: it gives you the cheaper of
 * two away, and only at the size the deal is on. That is a rule about a
 * basket rather than a number on a dish, so it is written as one: the dishes
 * that pair with each other carry the same label, and the size they have to
 * be is named beside it.
 *
 * Any two from the group, not two of the same thing. Somebody buying a large
 * pepperoni at 9,500 and a large meat at 8,900 pays 9,500, which is what the
 * counter itself does.
 *
 * Three pays for two, and the pairing is done from the top: the dearest two
 * make a pair and the cheapest is the one left over at full price. That is
 * the way round that costs the customer least. Pairing the dearest with the
 * cheapest instead would free a smaller pizza and charge for a bigger one,
 * which is the same deal read against them.
 */
export type PairRow = DealRow & {
  /** "pair" is the only kind this is about. Empty is an ordinary price. */
  deal_kind?: string | null;
  /** The label dishes that pair with each other share. */
  deal_pair?: string | null;
  /** The choice they have to have made, "Large". Empty means any. */
  deal_choice?: string | null;
};

/** Whether this dish is in a live buy-one-get-one at a given moment. */
export function pairLive(row: PairRow, now: Date = new Date()): boolean {
  if ((row.deal_kind ?? "") !== "pair") return false;
  if ((row.deal_pair ?? "").trim() === "") return false;
  const until = (row.deal_until ?? "").trim();
  if (until === "") return false;
  const ends = new Date(until).getTime();
  return Number.isFinite(ends) && ends > now.getTime();
}

/**
 * Whether a line qualifies: the right dish, at the size the deal is on.
 *
 * The names of what was chosen, as the menu says them, because that is what
 * a line carries and what somebody reads on their own order. Matched loosely
 * on case, since "Large" on one menu is "large" on another.
 */
export function pairQualifies(
  row: PairRow,
  chosen: string[],
  now: Date = new Date()
): boolean {
  if (!pairLive(row, now)) return false;
  const need = (row.deal_choice ?? "").trim().toLowerCase();
  if (need === "") return true;
  return chosen.some((one) => one.trim().toLowerCase() === need);
}

/** One qualifying thing in a basket: which deal it is in, and what it costs. */
export type PairUnit = { group: string; price: number };

/**
 * What comes off, for every two.
 *
 * Each group on its own, dearest first, and every second one is free. Three
 * larges is two paid and one free; five is three paid and two free.
 */
export function freeFromPairs(units: PairUnit[]): number {
  const byGroup = new Map<string, number[]>();
  for (const unit of units) {
    if (unit.group === "" || unit.price <= 0) continue;
    byGroup.set(unit.group, [...(byGroup.get(unit.group) ?? []), unit.price]);
  }

  let off = 0;
  for (const prices of byGroup.values()) {
    // Dearest first, then every second one is free: the second of each pair
    // is the cheaper half of that pair, and an odd one left at the end is
    // the cheapest of the lot, paid for in full.
    const sorted = [...prices].sort((a, b) => b - a);
    for (let at = 1; at < sorted.length; at += 2) off += sorted[at];
  }
  return off;
}

/** A live pairing, as a page hands it to the browser: which dishes are in
 *  it, the size they have to be, and what to call it on screen. */
export type PairDeal = {
  group: string;
  choice: string;
  itemIds: string[];
  /** "Buy one get one free at Domino's", for the line in the basket. */
  said: string;
};
/**
 * The pairings running right now, for the cart and the checkout.
 *
 * Both of those add the money up in the browser, so they need to know which
 * dishes pair with each other before anything is sent anywhere. It is a
 * handful of ids: the dishes a counter has put in a buy-one-get-one, which
 * is usually one size at one kitchen.
 */
export async function livePairDeals(): Promise<PairDeal[]> {
  try {
    const { data } = await db()
      .from("menu_items")
      .select("id, restaurant_id, deal_kind, deal_pair, deal_choice, deal_until")
      .eq("deal_kind", "pair")
      .gt("deal_until", new Date().toISOString());

    const rows = (data ?? []) as {
      id: string;
      restaurant_id: string;
      deal_pair: string | null;
      deal_choice: string | null;
    }[];
    if (rows.length === 0) return [];

    const names = new Map<string, string>();
    const places = [...new Set(rows.map((one) => one.restaurant_id))];
    const { data: shops } = await db()
      .from("restaurants")
      .select("id, name")
      .in("id", places);
    for (const one of (shops ?? []) as { id: string; name: string }[]) {
      names.set(one.id, one.name);
    }

    const byGroup = new Map<string, PairDeal>();
    for (const row of rows) {
      const group = (row.deal_pair ?? "").trim();
      if (group === "") continue;
      const had = byGroup.get(group);
      if (had) {
        had.itemIds.push(row.id);
        continue;
      }
      const where = names.get(row.restaurant_id) ?? "";
      const size = (row.deal_choice ?? "").trim();
      byGroup.set(group, {
        group,
        choice: size,
        itemIds: [row.id],
        said: `Buy one get one free${where === "" ? "" : ` at ${where}`}${
          size === "" ? "" : ` · ${size}`
        }`,
      });
    }
    return [...byGroup.values()];
  } catch {
    // A deal that cannot be read is a deal nobody is offered, which is the
    // safe way round: the basket adds up at the ordinary prices.
    return [];
  }
}

/**
 * What a basket in the browser gets off, and what to call it.
 *
 * The same sum the server does, from the same rule, so the line in the cart
 * is the line on the bill. A cart holds the names of what was chosen, which
 * is all the size constraint needs.
 */
export function pairsInCart(
  lines: { itemId: string; qty: number; unitPrice: number; choices: string[] }[],
  deals: PairDeal[]
): { off: number; said: string } {
  if (deals.length === 0) return { off: 0, said: "" };

  const units: PairUnit[] = [];
  const using = new Set<string>();
  for (const line of lines) {
    for (const deal of deals) {
      if (!deal.itemIds.includes(line.itemId)) continue;
      const need = deal.choice.trim().toLowerCase();
      if (
        need !== "" &&
        !line.choices.some((one) => one.trim().toLowerCase() === need)
      ) {
        continue;
      }
      for (let at = 0; at < Math.max(0, line.qty); at += 1) {
        units.push({ group: deal.group, price: line.unitPrice });
      }
      using.add(deal.said);
      break;
    }
  }

  const off = freeFromPairs(units);
  if (off <= 0) return { off: 0, said: "" };
  return { off, said: [...using].join(" · ") };
}

/**
 * Whether anything at all is on sale, for the chip on the browse page.
 *
 * A Deals chip in the row of aisles that leads to an empty page is worse
 * than no chip: somebody taps it once, finds nothing, and never taps it
 * again on the week a counter does cut a price. So the chip only exists
 * while there is something behind it.
 *
 * The same answer for everybody and a cheap one: a handful of columns off
 * the rows that have a live end date, and nothing about who is asking. The
 * minute it is held for only ever covers a stretch where nothing changed,
 * because admin clears this the moment anything does.
 */
async function readDealsOn(): Promise<boolean> {
  try {
    const { data } = await db()
      .from("menu_items")
      .select("price_food, deal_price, deal_until")
      .eq("available", true)
      .gt("deal_price", 0)
      .gt("deal_until", new Date().toISOString())
      .limit(60);
    // The cheaper-than-usual half in code, as everywhere else: one column
    // against another is not something the database can be asked from here.
    return ((data ?? []) as DealRow[]).some((one) => dealLive(one));
  } catch {
    // No chip rather than a wrong one.
    return false;
  }
}

export const dealsOn = unstable_cache(readDealsOn, ["deals-on"], {
  revalidate: 60,
  tags: ["menu"],
});
