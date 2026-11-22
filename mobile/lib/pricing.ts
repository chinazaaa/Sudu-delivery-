// A copy of the website's lib/pricing.ts: the phone cannot import server code.
// Keep the two in step.

export type ChosenOption = {
  id: string;
  /** As the menu writes it: "Large 14\"", "Extravaganza". */
  name: string;
  /** The group it was chosen in, and how that group is named, because a
   *  choice is only matched against the same group on the other item. */
  groupName: string;
  priceDelta: number;
  /** True where the group is halves of one thing rather than extras. */
  dearest: boolean;
  /** The item this choice really is, with what its own choices cost. Only
   *  on a halves choice, and only where somebody has linked it. */
  asItem?: AsItem | null;
};

export type AsItem = {
  /** The linked item's own price, before any of its choices. */
  base: number;
  /** What each of its choices adds, keyed by `key(group, option)`. */
  delta: Record<string, number>;
};

/** How a choice is named for matching across two items. */
export function key(groupName: string, optionName: string): string {
  return `${String(groupName ?? "").trim().toLowerCase()}\u0000${String(optionName ?? "")
    .trim()
    .toLowerCase()}`;
}

/**
 * What a half costs: the real item at the size this line asked for.
 *
 * The line's ordinary choices are mirrored onto the linked item by name, so
 * a large half and half asks the Extravaganza what a large Extravaganza
 * costs. A name the linked item does not have adds nothing, which is right:
 * a crust it does not offer is not a crust it charges for.
 *
 * Unlinked, the choice is worth what it says, which is the old behaviour
 * and keeps every group that has never been touched working as it did.
 */
export function halfPrice(one: ChosenOption, adds: ChosenOption[]): number {
  if (!one.asItem) return one.priceDelta;
  return (
    one.asItem.base +
    adds.reduce((sum, add) => sum + (one.asItem?.delta[key(add.groupName, add.name)] ?? 0), 0)
  );
}

/**
 * The price of one of something, with everything chosen on it.
 *
 * Ordinary choices add. Halves do not: the dearer of them is the price, and
 * the other is along for the ride, which is how every pizza counter in the
 * world has priced a half and half for fifty years.
 */
export function linePrice(base: number, chosen: ChosenOption[]): number {
  const adds = chosen.filter((one) => !one.dearest);
  const halves = chosen.filter((one) => one.dearest);

  const added = adds.reduce((sum, one) => sum + one.priceDelta, 0);
  if (halves.length === 0) return base + added;

  // The halves carry the whole price, so the item's own is left out rather
  // than added to it: a half and half costs what the dearer of its two
  // pizzas costs, and nothing on top. The figure on the item is then free
  // to be what a menu card wants, which is the cheapest it can come to,
  // and a shop with half a menu imported still cannot sell at nothing.
  return added + halves.reduce((most, one) => Math.max(most, halfPrice(one, adds)), 0);
}

/** One option as a page holds it, which is the shape the menu view uses. */
export type OptionLike = {
  id: string;
  name: string;
  priceDelta: number;
  asItem?: AsItem | null;
};

export type GroupLike = {
  name: string;
  dearest?: boolean;
  options: OptionLike[];
};

/** The chosen options of a page's groups, as the rule above wants them. */
export function chosenFrom(groups: GroupLike[], chosenIds: string[]): ChosenOption[] {
  return groups.flatMap((group) =>
    group.options
      .filter((option) => chosenIds.includes(option.id))
      .map((option) => ({
        id: option.id,
        name: option.name,
        groupName: group.name,
        priceDelta: option.priceDelta,
        dearest: group.dearest === true,
        asItem: option.asItem ?? null,
      }))
  );
}

/**
 * What the page shows, worked out the same way the server will charge it.
 *
 * The same function on both sides on purpose: a running total that adds up
 * differently from the till is the whole reason anybody distrusts a
 * checkout.
 */
export function pickedPrice(
  base: number,
  groups: GroupLike[],
  chosenIds: string[]
): number {
  return linePrice(base, chosenFrom(groups, chosenIds));
}

/**
 * What one half would make the pizza, for the line beside its name.
 *
 * Said as a price rather than as "+₦0", which is what a half costs on its
 * own and tells nobody anything. The dearer half is what the pizza costs,
 * so the two numbers beside the two flavours are the two possible answers.
 */
export function halfShown(
  group: GroupLike,
  option: OptionLike,
  groups: GroupLike[],
  chosenIds: string[]
): number | null {
  if (group.dearest !== true || !option.asItem) return null;
  const adds = chosenFrom(groups, chosenIds).filter((one) => !one.dearest);
  return halfPrice(
    {
      id: option.id,
      name: option.name,
      groupName: group.name,
      priceDelta: option.priceDelta,
      dearest: true,
      asItem: option.asItem,
    },
    adds
  );
}

/**
 * What a size, or any other plain choice, makes a half-and-half cost.
 *
 * A size on a half and half adds nothing of its own: the price comes from
 * the halves, at that size. So the size rows all read "+0" and looked like
 * one price, and a customer asked whether that was a mistake. This says what
 * the pizza would cost at each size instead, "from" until both halves are
 * picked because the dearer half is what sets it.
 *
 * Null on anything that is not a half and half, which keeps its plus.
 */
export function sizeShown(
  group: GroupLike,
  option: OptionLike,
  groups: GroupLike[],
  chosenIds: string[],
  base: number
): { price: number; from: boolean } | null {
  if (group.dearest === true) return null;
  if (!groups.some((one) => one.dearest === true)) return null;

  const ids = chosenIds
    .filter((id) => !group.options.some((one) => one.id === id))
    .concat(option.id);
  const adds = chosenFrom(groups, ids).filter((one) => !one.dearest);

  let from = false;
  const stand: string[] = [];
  for (const half of groups) {
    if (half.dearest !== true || half.options.some((one) => ids.includes(one.id))) continue;
    from = true;
    const cheapest = half.options
      .filter((one) => one.asItem)
      .map((one) => ({
        id: one.id,
        price: halfPrice(
          {
            id: one.id,
            name: one.name,
            groupName: half.name,
            priceDelta: one.priceDelta,
            dearest: true,
            asItem: one.asItem,
          },
          adds
        ),
      }))
      .sort((a, b) => a.price - b.price)[0];
    if (cheapest) stand.push(cheapest.id);
  }
  return { price: pickedPrice(base, groups, [...ids, ...stand]), from };
}
