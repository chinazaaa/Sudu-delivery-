import type { DrawingName } from "@/components/Drawing";

/**
 * Which drawing stands in for a thing that has no photograph.
 *
 * Read off the words rather than set per item, because four hundred menu
 * lines is four hundred things somebody would have to tag by hand, and a
 * new restaurant would arrive with none of them done. The words are the
 * ones on the menu: a thing called "Chicken Supreme" is a pizza and a thing
 * called "12pcs chicken" is not, so the pizza words are asked first.
 *
 * As soon as there is a real photograph it wins. This is what a card wears
 * while it waits.
 */
const BY_WORD: [RegExp, DrawingName][] = [
  // Asked before chicken, because half the pizzas on this shop have the
  // word chicken in their name.
  [/pizza|margherita|pepperoni|calzone|supreme/i, "pizza"],
  [/shawarma|wrap|burrito|roll\b/i, "shawarma"],
  [/burger|sandwich|toast(ie)?|club\b/i, "burger"],
  [/doughnut|donut|krispy|pastry|croissant|scone|puff/i, "doughnut"],
  [/cold ?stone|scoop|creamery/i, "cake"],
  [/cake|cupcake|brownie|cheesecake|pie\b|dessert|ice ?cream|sundae|waffle|pancake/i, "cake"],
  [/fish|titus|croaker|tilapia|prawn|shrimp|seafood|calamari/i, "fish"],
  [
    /rice|jollof|fried rice|pasta|spaghetti|noodle|indomie|swallow|amala|eba|semo|pounded|soup|stew|bowl|salad|beans|moi ?moi|yam|plantain|dodo/i,
    "bowl",
  ],
  [/chicken|wings|drumstick|turkey|gizzard|suya|beef|goat|meat|peppered|\bkfc\b/i, "chicken"],
  [
    /drink|juice|water|soda|coke|fanta|sprite|pepsi|7up|malt|smoothie|tea|coffee|latte|cappuccino|milkshake|zobo|cl\)|litre|ml\b/i,
    "drink",
  ],
  [/cream|lotion|serum|cleanser|toner|soap|skin|body|hair|shampoo|sunscreen|spf/i, "skincare"],
  [/parcel|package|courier|envelope/i, "parcel"],
  [/market|grocer|shop\b|store\b/i, "box"],
  [/gift|hamper|flowers|balloon|card\b/i, "box"],
];

/**
 * The drawing for one thing on the menu.
 *
 * The category is asked after the name, because a name is specific and a
 * category is a filing decision: "Drinks" holds the water and the Coke, and
 * "Combos" holds whatever somebody decided to put in it.
 */
export function drawingFor(name: string, category = ""): DrawingName {
  // The category first, because it is a decision the shop made on purpose
  // and a name is whatever the kitchen calls a thing. "BBQ Chicken" filed
  // under Pizzas is a pizza, and reading its name alone draws a drumstick.
  for (const [words, drawing] of BY_WORD) {
    if (category !== "" && words.test(category)) return drawing;
  }
  for (const [words, drawing] of BY_WORD) {
    if (words.test(name)) return drawing;
  }
  // A box, because a box is the one drawing that does not claim to be a
  // kind of food.
  return "box";
}

/**
 * The five colours a kitchen tile rotates through.
 *
 * Ours, never the restaurant's own. A tile in KFC's red with KFC's name on
 * it is a shop claiming a relationship it does not have, and we are a
 * courier rather than a franchise.
 */
export const TILES = [
  { bg: "#ffd23f", text: "#15110e" },
  { bg: "#e5321d", text: "#ffffff" },
  { bg: "#15110e", text: "#f2efe9" },
  { bg: "#fff6d6", text: "#15110e" },
  { bg: "#1e7a4c", text: "#ffffff" },
] as const;

/**
 * A kitchen's tile: its place in the rotation, and the drawing behind it.
 *
 * By position rather than by name, so the row is always five colours in
 * order rather than three yellows in a line. The drawing is picked off the
 * name the same way a dish is, which gets the chicken shop a chicken and
 * the doughnut shop a doughnut without anybody tagging anything.
 */
export function kitchenTile(
  name: string,
  at: number
): { bg: string; text: string; drawing: DrawingName } {
  const tile = TILES[at % TILES.length];
  const known = drawingFor(name);
  // A kitchen whose name says nothing about food gets one off the rotation
  // rather than the box every time, so a row of them is a row of different
  // drawings rather than five identical crates.
  const spare: DrawingName[] = ["bowl", "burger", "drink", "chicken", "cake"];
  return {
    ...tile,
    drawing: known === "box" ? spare[at % spare.length] : known,
  };
}
