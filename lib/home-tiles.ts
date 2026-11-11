import type { KindSource } from "./products";

/** One tile on the front page: a word, and where its dishes come from. */
export type HomeTile = {
  label: string;
  sources: KindSource[];
  shops: string[];
  /** A word in the name of the dish whose photo the tile wears. */
  photo: string;
  /** What to lead with inside it, as products.ts reads it. */
  first: string;
};

/**
 * The tiles, from a setting written one per line:
 *
 *   Rice & chicken | aisle:Rice, pasta & bowls; aisle:Chicken | The Place; Chicken Republic
 *   Burgers & shawarma | aisle:Burgers & wraps; q:shawarma
 *
 * The first part is what the tile says. The second is where its dishes
 * come from: an aisle, a word in the name (q:) or a section name
 * (category:), any number of them, separated by semicolons. The third is
 * optional and limits it to those counters. A fourth, also optional, is
 * photo:Some Dish (or Some Dish@Counter), to choose which dish's picture the tile wears. Typed in admin, so a new tile is
 * a line and not a deploy.
 */
export function parseHomeTiles(text: string | null | undefined): HomeTile[] {
  const tiles: HomeTile[] = [];
  for (const line of String(text ?? "").split("\n")) {
    const [label, from = "", only = "", ...extras] = line.split("|").map((part) => part.trim());
    const pick = (key: string) =>
      (extras.find((one) => one.toLowerCase().startsWith(`${key}:`)) ?? "").slice(key.length + 1).trim();
    if (!label || !from) continue;
    const sources: KindSource[] = [];
    for (const piece of from.split(";")) {
      const at = piece.indexOf(":");
      if (at < 0) continue;
      const kind = piece.slice(0, at).trim().toLowerCase();
      const value = piece.slice(at + 1).trim();
      if (!value) continue;
      if (kind === "aisle") sources.push({ aisle: value });
      else if (kind === "q" || kind === "word") sources.push({ q: value });
      else if (kind === "category") sources.push({ category: value });
    }
    if (sources.length === 0) continue;
    tiles.push({
      label,
      sources,
      shops: only.split(";").map((one) => one.trim()).filter(Boolean),
      photo: pick("photo"),
      first: pick("first"),
    });
  }
  return tiles;
}

/**
 * What the front page shows until tiles are written in admin. Edit them
 * there: this is only where it starts.
 */
export const DEFAULT_HOME_TILES = [
  "Pizza | aisle:Pizza",
  "Chicken | aisle:Chicken",
  "Burgers, pies, shawarma & wraps | aisle:Burgers & wraps; q:shawarma; q:chicken pie; q:meat pie | | photo:Shawarma@Chicken Republic",
  "Rice & chicken | aisle:Chicken; aisle:Rice, pasta & bowls; aisle:Meals & combos; q:rice; q:jollof | Chicken Republic; The Place | photo:Refuel More | first:jollof/rice + chicken",
].join("\n");

/**
 * Which dish's photo each "Something else" tile wears, one line each:
 *
 *   Soups & swallow | Seafood Okro
 *   Meals & combos | Carribean Meal Combo@Chicken Republic
 *
 * The aisle, then a word in the dish's name, then optionally @ the counter
 * when the same word is on several menus. An aisle with no line wears the
 * sharpest of its most ordered dishes.
 */
export function parseMorePhotos(
  text: string | null | undefined
): Record<string, { dish: string; counter: string }> {
  const out: Record<string, { dish: string; counter: string }> = {};
  for (const line of String(text ?? "").split("\n")) {
    const [aisle, pick = ""] = line.split("|").map((part) => part.trim());
    if (!aisle || !pick) continue;
    const [dish, counter = ""] = pick.split("@").map((part) => part.trim());
    if (dish) out[aisle] = { dish, counter };
  }
  return out;
}

export const DEFAULT_MORE_PHOTOS = [
  "Soups & swallow | Seafood Okro",
  "Meals & combos | Carribean Meal Combo@Chicken Republic",
].join("\n");
