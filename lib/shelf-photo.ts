import { db } from "./supabase";
import type { Box } from "./boxes";

/**
 * A photograph of the food on a shelf, for the card that opens it.
 *
 * The shelves were drawings: a line-art bucket beside "Care packages". Next
 * to a restaurant card carrying an actual photograph of a pizza, a drawing
 * reads as a placeholder somebody forgot to replace, and the shelf looks
 * like the part of the shop that is not finished.
 *
 * There is no need to buy photographs for this. The shelf is made of boxes,
 * the boxes are made of items, and better than three thousand items already
 * carry a picture. So a shelf borrows the picture of the best thing in it:
 * the dearest item on it with a photograph, which is reliably the
 * centrepiece rather than the sachet of seasoning beside it. Movie night
 * shows the pepperoni, Sunday lunch the rotisserie chicken.
 *
 * The drawing stays as the fallback, for a shelf whose contents are all
 * unphotographed.
 */
export async function shelfPhotos(boxes: Box[]): Promise<Record<string, string>> {
  const wanted = [
    ...new Set(
      boxes
        // An extra rides along with a box; it is pudding, not the dinner, and
        // it should not be what the shelf is advertised by.
        .filter((box) => !box.is_extra)
        .flatMap((box) => box.lines.map((line) => line.menu_item_id))
        .filter(Boolean)
    ),
  ];
  if (wanted.length === 0) return {};

  const { data, error } = await db()
    .from("menu_items")
    .select("id, image_url, price_food")
    .in("id", wanted);
  if (error) return {};

  const shot = new Map<string, { url: string; price: number }>();
  for (const row of (data ?? []) as {
    id: string;
    image_url?: string;
    price_food?: number;
  }[]) {
    const url = (row.image_url ?? "").trim();
    if (url !== "") shot.set(row.id, { url, price: row.price_food ?? 0 });
  }

  const best: Record<string, { url: string; price: number }> = {};
  for (const box of boxes) {
    if (box.is_extra) continue;
    for (const line of box.lines) {
      const found = shot.get(line.menu_item_id);
      if (!found) continue;
      const standing = best[box.occasion_id];
      if (!standing || found.price > standing.price) best[box.occasion_id] = found;
    }
  }

  return Object.fromEntries(
    Object.entries(best).map(([occasion, found]) => [occasion, found.url])
  );
}
