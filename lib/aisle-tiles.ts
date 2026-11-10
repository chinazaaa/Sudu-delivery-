import { unstable_cache } from "next/cache";

import { aislesFrom, NOT_DINNER } from "./aisles";
import { parseHomeTiles, type HomeTile } from "./home-tiles";
import { aisleFromPrices, kindShops } from "./products";
import { safeSettings } from "./settings";

/** A tile on the front page: what it says, and what it starts at. */
export type AisleTile = { aisle: string; from: number };

/**
 * Used when no tiles are written in admin: the shop's own aisle order, less
 * the ones that are a side or a drink, because nobody is unsure what to order
 * and answers "a sauce".
 */
const SIDES = ["Sides & snacks", "Drinks", "Sweet things", "Ice cream", "Groceries"];

export async function homeTileDefs(): Promise<HomeTile[]> {
  const written = parseHomeTiles((await safeSettings()).home_tiles);
  if (written.length > 0) return written;
  return aislesFrom((await safeSettings()).menu_aisles)
    .filter((one) => !NOT_DINNER.includes(one) && !SIDES.includes(one))
    .map((one) => ({ label: one, sources: [{ aisle: one }], shops: [] }));
}

async function readTiles(): Promise<AisleTile[]> {
  try {
    const defs = await homeTileDefs();
    const unwritten = parseHomeTiles((await safeSettings()).home_tiles).length === 0;
    if (unwritten) {
      const from = await aisleFromPrices(defs.map((one) => one.label));
      return defs
        .filter((one) => (from[one.label] ?? 0) > 0)
        .slice(0, 4)
        .map((one) => ({ aisle: one.label, from: from[one.label] }));
    }
    const out: AisleTile[] = [];
    for (const one of defs.slice(0, 6)) {
      const shops = await kindShops({ sources: one.sources, shops: one.shops }, 1);
      const from = Math.min(...shops.map((shop) => shop.from).filter((n) => n > 0));
      if (Number.isFinite(from)) out.push({ aisle: one.label, from });
    }
    return out;
  } catch {
    return [];
  }
}

export const aisleTiles = unstable_cache(readTiles, ["aisle-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});
