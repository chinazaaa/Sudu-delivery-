// Safe to import from the browser: nothing here touches the database.

/** A line as the cart's own `addLine` takes it, less what it works out. */
export type StarterLine = {
  itemId: string;
  optionIds: string[];
  name: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string;
  /** Base plus options, for display only. The server prices the order. */
  unitPrice: number;
  choices: string[];
  choiceFees: number[];
  qty: number;
  containerPct?: number;
};

/**
 * The lines a cart is missing from a starter, so opening one twice does
 * not double what is in it.
 *
 * Compared by the same key the cart files a line under, so a starter
 * whose pizza is already in the cart adds nothing, and one the visitor
 * took a drink out of puts back only the drink. Nothing is ever removed
 * or reduced: somebody who opens a link with their own cart half built
 * keeps all of it.
 */
export function missingFrom(
  starter: StarterLine[],
  have: { itemId: string; optionIds: string[]; forName?: string }[],
  keyOf: (itemId: string, optionIds: string[]) => string
): StarterLine[] {
  const held = new Set(have.map((line) => keyOf(line.itemId, line.optionIds)));
  return starter.filter((line) => !held.has(keyOf(line.itemId, line.optionIds)));
}
