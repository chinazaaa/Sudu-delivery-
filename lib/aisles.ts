/**
 * Twelve ways in, over a hundred and five ways the kitchens file things.
 *
 * Every menu was imported the way its own kitchen keeps it, which is the
 * right way to show one restaurant's menu and the wrong way to show all of
 * them at once. Browse ended up with a filter row of twenty-five where
 * "Burgers" sat beside "Burgers & sandwiches", and where half the words were
 * a kitchen's internal filing rather than anything a student would look for:
 * Campaign, Deal, Add-ons, BK Jollof Rice.
 *
 * So each of a kitchen's own sections is also filed under one aisle, and the
 * aisle is what the whole shop is browsed by. The kitchen's own words are
 * untouched and still what you see on its own menu, because "Dodsters &
 * pockets" is what Dodo Pizza calls them and we are not the ones to rename
 * it.
 *
 * The list is a setting. These are the aisles to begin with, not the aisles
 * for good: a shop that starts selling something else wants a word for it
 * that afternoon, not at the next deploy.
 */
export const AISLES = [
  "Pizza",
  "Chicken",
  "Burgers & wraps",
  "Rice, pasta & bowls",
  "Soups & swallow",
  "Meals & combos",
  "Sides & snacks",
  "Sweet things",
  "Drinks",
  "Groceries",
  "For the room",
  "Extras & add-ons",
];

/** The aisles this shop uses, in the order they are shown. */
export function aislesFrom(said: string | null | undefined): string[] {
  const lines = String(said ?? "")
    .split("\n")
    .map((one) => one.trim())
    .filter((one) => one !== "");
  return lines.length > 0 ? lines : AISLES;
}

/**
 * Which aisle a kitchen's own word belongs in, guessed.
 *
 * Only ever a guess, and only ever a starting point: every one of them is
 * a dropdown in admin, and the guess is there so that importing a menu of
 * forty sections does not mean forty dropdowns before anybody can browse.
 *
 * The order is the whole rule. "Dips & sides" is an add-on and not a side,
 * "Burrito Wraps" is a wrap and "Burrito Bowls" is a bowl, and the first
 * line that matches wins, so the narrow words go above the broad ones.
 */
const RULES: [string, RegExp][] = [
  ["Extras & add-ons", /add-?ons?|topping|sauce|dip|mix-?in|\boptions?\b|accessor/i],
  ["For the room", /for the room|gifting|toiletr|household|pantry|\bcards?\b|sticker/i],
  ["Pizza", /pizza|dodster|pocket/i],
  ["Soups & swallow", /soup|swallow/i],
  ["Chicken", /chicken|wings|rotisserie|alacarte|a la carte/i],
  ["Burgers & wraps", /burger|sandwich|wrap|hot ?dog|dawg|gourmet|shawarma/i],
  ["Sweet things", /dessert|cake|doughnut|donut|ice ?cream|scoop|waffle|crepe|signature creation|flavour|flavor|pull apart|sweet|chocolate/i],
  ["Drinks", /drink|coffee|\btea\b|shake|chiller|water|juice|smoothie/i],
  ["Groceries", /pepper|vegetable|fruit|grain|tuber|protein|\bmeat\b|\bfish\b|condiment|baking|grocer/i],
  ["Rice, pasta & bowls", /rice|pasta|noodle|bowl|jollof|vegan|stir ?fry/i],
  ["Meals & combos", /meals?\b|combo|\bdeal|special|kids|squad|citizens|value|lunch|platter/i],
  ["Sides & snacks", /side|snack|chops|starter|salad|bread|extras|fries|\bpies?\b/i],
];

/**
 * Nothing rather than a wrong guess.
 *
 * A section the rules do not recognise is left unfiled, which costs it a
 * chip in the filter row and nothing else: everything in it is still on the
 * shop, still searchable and still on its own kitchen's menu. A section
 * filed under the wrong aisle is worse than one filed under none, because
 * the only person who would ever find out is the student who went looking
 * for it in the right place.
 */
export function guessAisle(section: string): string {
  const said = section.trim();
  if (said === "") return "";
  for (const [aisle, pattern] of RULES) if (pattern.test(said)) return aisle;
  return "";
}
