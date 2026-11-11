import { unstable_cache } from "next/cache";

import { aislesFrom, NOT_DINNER } from "./aisles";
import {
  DEFAULT_HOME_TILES,
  DEFAULT_MORE_PHOTOS,
  parseHomeTiles,
  parseMorePhotos,
  type HomeTile,
} from "./home-tiles";
import { kindShops } from "./products";
import { db } from "./supabase";
import { safeSettings } from "./settings";
import { boxesAcross, occasionBySlug } from "./boxes";
import { cheapestBoxes } from "./box-view";
import { shelfPhotos } from "./shelf-photo";

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
export async function moreAisles(everything = false): Promise<string[]> {
  const covered = new Set<string>();
  for (const tile of await homeTileDefs()) {
    if (tile.shops.length > 0) continue;
    for (const source of tile.sources) if (source.aisle) covered.add(source.aisle);
  }
  return aislesFrom((await safeSettings()).menu_aisles).filter(
    (one) =>
      !covered.has(one) &&
      !(everything && one === "For the room") &&
      (everything || (!NOT_DINNER.includes(one) && one !== "Drinks" && one !== "Groceries"))
  );
}


/**
 * The sharpest of a few candidate photos, judged by file size.
 *
 * Some dishes have a small or smeared picture, and the most ordered dish
 * under a tile is not always the one with a good one. A bigger file is a
 * sharper picture, so the biggest of the most ordered few wears the tile.
 * Anything that cannot be measured counts as nothing, and the first
 * candidate is used if none can be.
 */
async function sharpest(urls: string[]): Promise<string> {
  if (urls.length <= 1) return urls[0] ?? "";
  const sizes = await Promise.all(
    urls.map(async (url) => {
      try {
        const reply = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(2500) });
        return Number(reply.headers.get("content-length") ?? 0);
      } catch {
        return 0;
      }
    })
  );
  let best = 0;
  sizes.forEach((size, at) => {
    if (size > sizes[best]) best = at;
  });
  return urls[best];
}

const mostOrdered = (shops: { items: { imageUrl: string; orderedCount: number }[] }[]) =>
  shops
    .flatMap((shop) => shop.items)
    .filter((dish) => dish.imageUrl !== "")
    .sort((a, b) => b.orderedCount - a.orderedCount)
    .slice(0, 6)
    .map((dish) => dish.imageUrl);

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
      const named = dishWord
        ? pictured.find((dish) => dish.name.toLowerCase().includes(dishWord.toLowerCase()))
        : undefined;
      out.push({
        aisle: one.label,
        from,
        image: named?.imageUrl ?? (await sharpest(mostOrdered(shops))),
      });
      if (out.length === 4) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function readMore(everything = false): Promise<AisleTile[]> {
  try {
    const out: AisleTile[] = [];
    const saved = (await safeSettings()).more_photos;
    const picks = parseMorePhotos(saved.trim() === "" ? DEFAULT_MORE_PHOTOS : saved);
    for (const aisle of await moreAisles(everything)) {
      const pick = picks[aisle];
      const shops = await kindShops({ aisle }, pick ? 80 : 8);
      const from = Math.min(...shops.map((shop) => shop.from).filter((n) => n > 0));
      if (!Number.isFinite(from)) continue;
      // The dish the tile was told to wear, where there is one with a photo.
      const named = pick
        ? shops
            .filter((shop) => pick.counter === "" || shop.name.toLowerCase() === pick.counter.toLowerCase())
            .flatMap((shop) => shop.items)
            .find(
              (dish) =>
                dish.imageUrl !== "" && dish.name.toLowerCase().includes(pick.dish.toLowerCase())
            )
        : undefined;
      out.push({ aisle, from, image: named?.imageUrl ?? (await sharpest(mostOrdered(shops))) });
      if (!everything && out.length === 8) break;
    }
    return out;
  } catch {
    return [];
  }
}

export const moreTiles = unstable_cache(() => readMore(false), ["more-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});

export const aisleTiles = unstable_cache(readTiles, ["aisle-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});

/** Every aisle the shop has, for the menu page. */
export const everyAisleTile = unstable_cache(() => readMore(true), ["every-aisle-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});

export type KitchenTile = { id: string; slug: string; name: string; from: number; image: string };

async function readKitchens(): Promise<KitchenTile[]> {
  try {
    const shops = await kindShops({ all: true }, 40);
    const out: (KitchenTile & { orders: number })[] = [];
    for (const shop of shops) {
      out.push({
        id: shop.id,
        slug: shop.slug || shop.id,
        name: shop.name,
        from: shop.from,
        image: (await sharpest(mostOrdered([shop]))) || shop.logoUrl || "",
        orders: shop.items.reduce((total, dish) => total + dish.orderedCount, 0),
      });
    }
    // Restaurants people have ordered from first, most ordered on top. The
    // shop's own counter is not a restaurant, so it sits after those and
    // before the ones nobody has ordered from yet.
    const { data } = await db().from("restaurants").select("id, kind");
    const kind = new Map(((data ?? []) as { id: string; kind: string | null }[]).map((r) => [r.id, r.kind ?? "food"]));
    const tier = (one: { id: string; orders: number }) =>
      (kind.get(one.id) ?? "food") !== "food" ? 1 : one.orders > 0 ? 0 : 2;
    return out
      .sort(
        (a, b) =>
          tier(a) - tier(b) || b.orders - a.orders || a.name.localeCompare(b.name)
      )
      .map(({ orders: _orders, ...tile }) => tile);
  } catch {
    return [];
  }
}

/** Every kitchen as a tile: a photo, its name and where its prices start. */
export const kitchenTiles = unstable_cache(readKitchens, ["kitchen-tiles"], {
  revalidate: 60,
  tags: ["menu"],
});

export type FeaturedTile = { aisle: string; from: number; image: string; href: string };

async function readFeatured(): Promise<FeaturedTile | null> {
  try {
    const slug = ((await safeSettings()).featured_shelf ?? "").trim();
    if (slug === "") return null;
    const shelf = await occasionBySlug(slug);
    if (!shelf) return null;
    const boxes = (await boxesAcross([shelf.id])).filter((box) => !box.is_extra);
    if (boxes.length === 0) return null;
    const [from, photo] = await Promise.all([
      cheapestBoxes(boxes).catch(() => new Map<string, number>()),
      shelfPhotos(boxes).catch(() => ({}) as Record<string, string>),
    ]);
    return {
      aisle: shelf.name,
      from: from.get(shelf.id) ?? 0,
      image: photo[shelf.id] || shelf.image_url || "",
      href: `/collections/${shelf.slug}`,
    };
  } catch {
    return null;
  }
}

/** The collection the shop wants in front of people, if it has picked one. */
export const featuredTile = unstable_cache(readFeatured, ["featured-tile"], {
  revalidate: 60,
  tags: ["menu"],
});
