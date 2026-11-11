import { unstable_cache } from "next/cache";

import { aislesFrom, NOT_DINNER } from "./aisles";
import { DEFAULT_HOME_TILES, parseHomeTiles, type HomeTile } from "./home-tiles";
import { kindShops } from "./products";
import { safeSettings } from "./settings";

/** A tile on the front page: what it says, and what it starts at. */
export type AisleTile = { aisle: string; from: number; image: string };

/**
 * Used when no tiles are written in admin: the shop's own aisle order, less
 * the ones that are a side or a drink, because nobody is unsure what to order
 * and answers "a sauce".
 */

export async function homeTileDefs(): Promise<HomeTile[]> {
  const settings = await safeSettings();
  const written = parseHomeTiles(settings.home_tiles);
  return written.length > 0 ? written : parseHomeTiles(DEFAULT_HOME_TILES);
}

/**
 * The aisles the big tiles already cover on their own, so the row under them
 * only offers what is not there. A tile limited to some counters does not
 * cover its aisle for everyone else.
 */
export async function moreAisles(): Promise<string[]> {
  const covered = new Set<string>();
  for (const tile of await homeTileDefs()) {
    if (tile.shops.length > 0) continue;
    for (const source of tile.sources) if (source.aisle) covered.add(source.aisle);
  }
  return aislesFrom((await safeSettings()).menu_aisles).filter(
    (one) => !covered.has(one) && !NOT_DINNER.includes(one) && one !== "Drinks" && one !== "Groceries"
  );
}

async function readTiles(): Promise<AisleTile[]> {
  try {
    const defs = await homeTileDefs();
    const out: AisleTile[] = [];
    for (const one of defs) {
      const shops = await kindShops({ sources: one.sources, shops: one.shops, first: one.first }, one.photo ? 80 : 8);
      const from = Math.min(...shops.map((shop) => shop.from).filter((n) => n > 0));
      if (!Number.isFinite(from)) continue;
      // A photo of what is most ordered under it, so the tile shows food and
      // not a drawing of it.
      // "Dish@Counter" picks that dish at that counter, when the same word is
      // on several menus.
      const [dishWord, counter = ""] = one.photo.split("@").map((part) => part.trim());
      const pictured = shops
        .filter((shop) => counter === "" || shop.name.toLowerCase() === counter.toLowerCase())
        .flatMap((shop) => shop.items)
        .filter((dish) => dish.imageUrl !== "");
      // The dish the tile asks for by name, else whatever is most ordered.
      const photo =
        (dishWord
          ? pictured.find((dish) => dish.name.toLowerCase().includes(dishWord.toLowerCase()))
          : undefined) ??
        [...shops.flatMap((shop) => shop.items).filter((dish) => dish.imageUrl !== "")].sort(
          (a, b) => b.orderedCount - a.orderedCount
        )[0];
      out.push({ aisle: one.label, from, image: photo?.imageUrl ?? "" });
      if (out.length === 4) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function readMore(): Promise<AisleTile[]> {
  try {
    const out: AisleTile[] = [];
    for (const aisle of await moreAisles()) {
      const shops = await kindShops({ aisle }, 8);
      const from = Math.min(...shops.map((shop) => shop.from).filter((n) => n > 0));
      if (!Number.isFinite(from)) continue;
      const photo = shops
        .flatMap((shop) => shop.items)
        .filter((dish) => dish.imageUrl !== "")
        .sort((a, b) => b.orderedCount - a.orderedCount)[0];
      out.push({ aisle, from, image: photo?.imageUrl ?? "" });
      if (out.length === 6) break;
    }
    return out;
  } catch {
    return [];
  }
}

export const moreTiles = unstable_cache(readMore, ["more-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});

export const aisleTiles = unstable_cache(readTiles, ["aisle-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});
