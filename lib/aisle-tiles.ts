import { unstable_cache } from "next/cache";

import { aislesFrom, NOT_DINNER } from "./aisles";
import { aisleFromPrices } from "./products";
import { safeSettings } from "./settings";

/** An aisle as a way in from the front page: what it is, and what it starts at. */
export type AisleTile = { aisle: string; from: number };

/**
 * The aisles to offer as a first choice.
 *
 * The shop's own aisle order decides which come first, so putting
 * something at the top of that list in admin puts it here. The ones that are
 * a side or a drink are left out, because nobody is unsure what to order
 * and answers "a sauce".
 */
const SIDES = ["Sides & snacks", "Drinks", "Sweet things", "Ice cream", "Groceries"];

async function readTiles(): Promise<AisleTile[]> {
  try {
    const chosen = aislesFrom((await safeSettings()).menu_aisles)
      .filter((one) => !NOT_DINNER.includes(one) && !SIDES.includes(one));
    const from = await aisleFromPrices(chosen);
    return chosen
      .filter((one) => (from[one] ?? 0) > 0)
      .slice(0, 4)
      .map((one) => ({ aisle: one, from: from[one] }));
  } catch {
    return [];
  }
}

export const aisleTiles = unstable_cache(readTiles, ["aisle-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});
