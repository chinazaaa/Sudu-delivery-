import { db } from "./supabase";
import { sellingNow, type DealRow } from "./deals";
import { optionGroupsFor } from "./menu";
import type { FullOrder } from "./orders";
import type { OptionGroupView } from "./view";

/** One line of an unpaid order, with everything the change screen needs to
 *  let somebody swap its size or flavour without leaving the page. */
export type ChangeLineData = {
  id: string;
  itemId: string;
  name: string;
  restaurant: string;
  qty: number;
  unitPrice: number;
  /** The choices on it, said the way the order page says them. */
  choices: string;
  /** The item's price before any choice, as it stands today. */
  base: number;
  /** The options chosen right now, by id. */
  chosenIds: string[];
  /** What it offers: sizes, flavours, crusts. Empty for a plain item. */
  groups: OptionGroupView[];
  /** What it could be swapped for: the other things in its category at the
   *  same kitchen, with what each one asks. */
  swaps: SwapTarget[];
};

export type SwapTarget = {
  id: string;
  name: string;
  base: number;
  groups: OptionGroupView[];
};

/**
 * What the "change this order" screen is built from.
 *
 * Read here rather than in the page so the page stays a page. The bag of ice
 * is left out because it is the shop's and not the customer's to change.
 */
export async function changeLinesFor(
  order: FullOrder,
  iceItem: string
): Promise<ChangeLineData[]> {
  const lines = order.lines.filter((line) => line.menu_item_id !== iceItem);
  if (lines.length === 0) return [];

  const itemIds = [...new Set(lines.map((line) => line.menu_item_id))];
  const [{ data: items }, { data: chosen }, groups] = await Promise.all([
    db().from("menu_items").select("id, price_food, deal_price, deal_until").in("id", itemIds),
    db()
      .from("order_item_options")
      .select("order_item_id, option_id")
      .in("order_item_id", lines.map((line) => line.id)),
    optionGroupsFor(itemIds),
  ]);

  // Swap targets: same kitchen, same category, on sale today.
  const { data: mine } = await db()
    .from("menu_items")
    .select("id, restaurant_id, category_id")
    .in("id", itemIds);
  const where = new Map(
    ((mine ?? []) as { id: string; restaurant_id: string; category_id: string | null }[]).map(
      (row) => [row.id, row]
    )
  );
  const categories = [
    ...new Set([...where.values()].map((row) => row.category_id).filter((id): id is string => !!id)),
  ];
  const { data: siblingRows } = categories.length
    ? await db()
        .from("menu_items")
        .select("id, name, restaurant_id, category_id, price_food, deal_price, deal_until, available")
        .in("category_id", categories)
        .eq("available", true)
        .order("sort_order")
    : { data: [] };
  const siblings = ((siblingRows ?? []) as (DealRow & {
    id: string;
    name: string;
    restaurant_id: string;
    category_id: string;
  })[]).filter((row) => row.id !== iceItem);
  const siblingGroups = await optionGroupsFor(siblings.map((row) => row.id));

  const base = new Map(
    ((items ?? []) as (DealRow & { id: string })[]).map((row) => [row.id, sellingNow(row)])
  );
  const chosenBy = new Map<string, string[]>();
  for (const row of (chosen ?? []) as { order_item_id: string; option_id: string | null }[]) {
    if (!row.option_id) continue;
    chosenBy.set(row.order_item_id, [...(chosenBy.get(row.order_item_id) ?? []), row.option_id]);
  }

  return lines.map((line) => ({
    id: line.id,
    itemId: line.menu_item_id,
    name: line.name,
    restaurant: line.restaurant,
    qty: line.qty,
    unitPrice: line.unit_price_at_order,
    choices: line.choices.join(", "),
    base: base.get(line.menu_item_id) ?? line.unit_price_at_order,
    chosenIds: chosenBy.get(line.id) ?? [],
    groups: groups.get(line.menu_item_id) ?? [],
    swaps: siblings
      .filter((row) => {
        const here = where.get(line.menu_item_id);
        return (
          here !== undefined &&
          row.id !== line.menu_item_id &&
          row.restaurant_id === here.restaurant_id &&
          row.category_id === here.category_id
        );
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        base: sellingNow(row),
        groups: siblingGroups.get(row.id) ?? [],
      })),
  }));
}
