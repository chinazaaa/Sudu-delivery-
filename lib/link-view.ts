import { db } from "./supabase";
import { priceLines } from "./orders";
import { getCheckoutLink, type CheckoutLink } from "./checkout-links";
import { arrivalNow } from "./arrival-server";
import { ESTIMATE_NOTE } from "./arrival";
import type { CartLine } from "./types";

/**
 * A basket somebody was sent, worked out once.
 *
 * The website draws it and so does the app, and the two must agree about
 * every figure on it: what it costs, when it comes, what can be swapped. So
 * it is worked out here rather than twice, once in each.
 */
export type LinkView = {
  code: string;
  title: string;
  /** When it lands, as a sentence: "Order now, get it around 4:30pm today". */
  when: string;
  estimate: string;
  note: string;
  lines: {
    name: string;
    restaurant: string;
    qty: number;
    choices: string[];
    total: number;
  }[];
  food: number;
  /** What delivery costs on this one, when it was set. Null leaves the
   *  ordinary rules, which cannot be known until the order is placed. */
  fee: number | null;
  /** What they can swap at no cost: the crust, which drink. */
  swaps: { name: string; chosen: string; others: string[] }[];
  /** What they can have instead, each costing what the basket costs. */
  instead: {
    index: number;
    name: string;
    restaurant: string;
    choices: string[];
    items: number;
    food: number;
  }[];
  hasCardLink: boolean;
};

export type LinkProblem = { error: string; stopped?: boolean };

/**
 * The swaps this basket allows, with what it currently says.
 *
 * A link settles every question that moves the price, and the crust is not
 * one of them: Hand Tossed and Thin Crust cost the same, so somebody who
 * would rather have the other can simply have it. Saying which was picked,
 * and what else there is, is the difference between a blank box and an offer.
 */
export async function freeSwaps(
  lines: CartLine[]
): Promise<{ name: string; chosen: string; others: string[] }[]> {
  const chosen = new Set(lines.flatMap((line) => line.option_ids ?? []));
  const items = [...new Set(lines.map((line) => line.menu_item_id))];
  if (items.length === 0) return [];

  const { data: groups } = await db()
    .from("item_option_groups")
    .select("id, name")
    .in("menu_item_id", items);
  if (!groups || groups.length === 0) return [];

  const { data: options } = await db()
    .from("item_options")
    .select("id, group_id, name, price_delta, available")
    .in(
      "group_id",
      (groups as { id: string }[]).map((group) => group.id)
    );

  return (groups as { id: string; name: string }[])
    .map((group) => {
      const theirs = ((options ?? []) as {
        id: string;
        group_id: string;
        name: string;
        price_delta: number;
        available: boolean;
      }[]).filter((option) => option.group_id === group.id && option.available);

      // Only where every answer costs the same. A size is not a swap, it is
      // a different price, and offering it in a note would be a promise the
      // total does not keep.
      const free = theirs.every((option) => option.price_delta === theirs[0]?.price_delta);
      const others = theirs.filter((option) => !chosen.has(option.id));
      if (!free || theirs.length < 2 || others.length === 0) return null;

      return {
        name: group.name,
        chosen: theirs.find((option) => chosen.has(option.id))?.name ?? "",
        others: others.map((option) => option.name),
      };
    })
    .filter((one): one is { name: string; chosen: string; others: string[] } => one !== null);
}

/** The whole basket, priced from the menu at the moment it is opened. */
export async function linkView(code: string): Promise<LinkView | LinkProblem> {
  const link = await getCheckoutLink(code);
  if (!link) return { error: "That link does not exist." };
  if (!link.active) {
    return {
      error: "It was for something that has been and gone. The menu is still open.",
      stopped: true,
    };
  }

  // Priced here, from the menu, every time it is opened. A link that carried
  // its own figures would quietly disagree with the shop the moment anything
  // changed, and the order itself prices from the menu regardless.
  const priced = await priceLines(link.lines);
  if ("error" in priced) return { error: priced.error };

  const { data: places } = await db()
    .from("restaurants")
    .select("id, name")
    .in("id", [...new Set(priced.lines.map((line) => line.item.restaurant_id))]);
  const kitchens = new Map(
    ((places ?? []) as { id: string; name: string }[]).map((one) => [one.id, one.name])
  );

  // There is no dead end here. A link pinned to a run that has closed takes
  // whatever is going soonest instead, because somebody who wants dinner
  // should never be handed nothing.
  const going = await arrivalNow({ batchId: link.batch_id, deliverAt: link.deliver_at });
  if (!going) return { error: "Nothing is going just now. The menu is still open." };

  return {
    code: link.short ?? link.id,
    title: link.label || "Your order",
    when: `Order now, get it ${going.said}`,
    estimate: ESTIMATE_NOTE,
    note: link.note,
    lines: priced.lines.map((line) => ({
      name: line.item.name,
      restaurant: kitchens.get(line.item.restaurant_id) ?? "",
      qty: line.qty,
      choices: line.options.map((one) => one.name),
      total: line.unitPrice * line.qty,
    })),
    food: priced.lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
    fee: link.fee,
    swaps: await freeSwaps(link.lines),
    instead: await instead(link),
    hasCardLink: link.payment_link !== "",
  };
}

/** What they can have instead, each costing what the basket costs or less. */
async function instead(link: CheckoutLink): Promise<LinkView["instead"]> {
  const all = await Promise.all(
    link.alternatives.map(async (line, index) => {
      const one = await priceLines([line]);
      return "error" in one
        ? null
        : {
            index,
            name: one.lines[0].item.name,
            restaurant: "",
            choices: one.lines[0].options.map((option) => option.name),
            items: one.lines[0].qty,
            // The same as the basket, or less: never more, so the total can
            // only fall when somebody picks one.
            food: one.lines[0].unitPrice * one.lines[0].qty,
          };
    })
  );
  const found = all.filter((one) => one !== null);
  if (found.length === 0) return [];

  const { data: places } = await db()
    .from("restaurants")
    .select("id, name")
    .in(
      "id",
      [...new Set(link.alternatives.map((line) => line.menu_item_id))].length > 0
        ? await restaurantIdsOf(link.alternatives)
        : []
    );
  const named = new Map(
    ((places ?? []) as { id: string; name: string }[]).map((one) => [one.id, one.name])
  );
  const byItem = await restaurantOfItems(link.alternatives);

  return found.map((one, at) => ({
    ...one,
    restaurant: named.get(byItem.get(link.alternatives[at]?.menu_item_id ?? "") ?? "") ?? "",
  }));
}

async function restaurantOfItems(lines: CartLine[]): Promise<Map<string, string>> {
  const ids = [...new Set(lines.map((line) => line.menu_item_id))];
  if (ids.length === 0) return new Map();
  const { data } = await db().from("menu_items").select("id, restaurant_id").in("id", ids);
  return new Map(
    ((data ?? []) as { id: string; restaurant_id: string }[]).map((one) => [
      one.id,
      one.restaurant_id,
    ])
  );
}

async function restaurantIdsOf(lines: CartLine[]): Promise<string[]> {
  return [...new Set([...(await restaurantOfItems(lines)).values()])];
}
