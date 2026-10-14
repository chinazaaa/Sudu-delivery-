/**
 * What one line of a cart costs.
 *
 * For years this was base price plus every choice added up, which is right
 * for a size, a crust and a sauce: each of those is a thing done to the
 * pizza and each costs what it says.
 *
 * It is wrong for halves. A half and half is one pizza, and the two choices
 * on it describe the two halves of that one pizza rather than two things
 * bought. Added up, a large Extravaganza and BBQ Chicken came to ₦13,375
 * when the Extravaganza alone is ₦15,225, so the shop sold a pizza for less
 * than it pays for it and nothing on the screen said so.
 *
 * Nor could it be patched with better numbers. The gap between flavours
 * moves with the size: at medium the Extravaganza is ₦1,200 over the
 * cheapest, at large it is ₦2,415. No flat figure is right at both.
 *
 * So a group can say it is halves, and a choice inside one can say which
 * item on the menu it really is. The price of that half is then the real
 * price of the real pizza at the size this line asked for, read live, and
 * the line is charged the dearer of its halves. Put the Extravaganza up
 * next month and the half and half follows on its own.
 */

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
