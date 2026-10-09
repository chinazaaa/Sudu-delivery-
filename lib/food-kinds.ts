/**
 * What somebody arrived wanting, as a row of chips.
 *
 * The home page opens on restaurant logos, which is right for half of the
 * people who come: they want KFC and they want it now. The other half have
 * decided they want rice and do not care whose. For them the page was a
 * search box, which is a question rather than an answer.
 *
 * Written here rather than read from the menu categories, which are each
 * restaurant's own filing: "Dodsters & pockets", "Alacarte", "Pepper,
 * vegetable & fruits". Nobody arrives wanting an alacarte. These are the
 * words people actually use, pointed at the one list that already searches
 * across every menu.
 *
 * A chip searches by word where the word is in what things are called, and
 * by category where it is not: nothing on Dodo's menu has "pizza" in its
 * name, because the whole menu is pizzas.
 */
export type FoodKind = {
  label: string;
  emoji: string;
  /** A word to search item names for. */
  q?: string;
  /** Or a menu category to filter by, for a kind whose items never say it. */
  category?: string;
};

export const FOOD_KINDS: FoodKind[] = [
  { label: "Chicken", emoji: "🍗", q: "chicken" },
  { label: "Rice", emoji: "🍚", q: "rice" },
  { label: "Pizza", emoji: "🍕", category: "Pizzas" },
  { label: "Burgers", emoji: "🍔", q: "burger" },
  { label: "Shawarma", emoji: "🌯", q: "shawarma" },
  { label: "Wings", emoji: "🔥", q: "wings" },
  { label: "Pasta", emoji: "🍝", q: "pasta" },
  { label: "Cake", emoji: "🍰", q: "cake" },
  { label: "Doughnuts", emoji: "🍩", q: "doughnut" },
  { label: "Fish", emoji: "🐟", q: "fish" },
  { label: "Drinks", emoji: "🥤", category: "Drinks" },
];

/** Where a chip goes: the everything list, already narrowed. */
export function kindHref(one: FoodKind): string {
  const now = new URLSearchParams();
  if (one.q) now.set("q", one.q);
  if (one.category) now.set("category", one.category);
  return `/products?${now.toString()}`;
}
