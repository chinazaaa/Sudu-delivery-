/**
 * What kind of food, as the row of chips on the home screen.
 *
 * It used to be worked out from the menu: every kitchen's category names,
 * counted, commonest first. That reads like a good idea and is not. The
 * categories are a filing decision made per counter, so the row filled up
 * with "Drinks", "Protein" and "Bread", which is a stock list rather than
 * an answer to "what do you fancy", and the two kinds people actually open
 * the app for and cannot find by name, pizza and ice cream, were missing.
 *
 * So it is the website's list, in the website's order, and the two places
 * say the same thing. Each chip narrows the menu the same way the website
 * narrows it: by a word, by a counter's own category, or by one of the
 * shop's aisles.
 */
export type Kind = {
  label: string;
  emoji: string;
  /** Searched as a word. */
  q?: string;
  /** A counter's own category: small chops are called spring rolls and
   *  puff puff, and none of them says "small chops". */
  category?: string;
  /** One of the shop's aisles, for the ones no word finds: Cold Stone
   *  names every tub "... Ice Cream" and Scoop'd names them "Padi (1
   *  Scoop)". */
  aisle?: string;
};

export const KINDS: Kind[] = [
  { label: "Chicken", emoji: "🍗", q: "chicken" },
  { label: "Rice", emoji: "🍚", q: "rice" },
  { label: "Pizza", emoji: "🍕", aisle: "Pizza" },
  { label: "Burgers", emoji: "🍔", q: "burger" },
  { label: "Shawarma", emoji: "🌯", q: "shawarma" },
  { label: "Small chops", emoji: "🍢", category: "Small Chops" },
  { label: "Pasta", emoji: "🍝", q: "pasta" },
  { label: "Ice cream", emoji: "🍦", aisle: "Ice cream" },
  { label: "Doughnuts", emoji: "🍩", q: "doughnut" },
];

/** Where a chip goes, as a path the menu screen understands. */
export function kindPath(one: Kind): string {
  const now = new URLSearchParams();
  if (one.q) now.set("q", one.q);
  if (one.category) now.set("category", one.category);
  if (one.aisle) now.set("aisle", one.aisle);
  return `/products?${now.toString()}`;
}
