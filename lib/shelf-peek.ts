import { boxesOf, occasionBySlug } from "./boxes";
import { boxViews, type BoxView } from "./box-view";

/**
 * What a shelf holds, for a page written before the shelf exists.
 *
 * The pages for a season go up months before anything is packed for it,
 * because the waiting is the part that cannot be hurried: a page put up in
 * the week that matters is a page nothing has had time to find. So they are
 * written to work with nothing behind them, say "tell us what you want",
 * and start showing boxes by themselves the day somebody packs one in
 * admin. No deploy, no edit, nothing to remember.
 *
 * Nothing here is allowed to fail loudly. A page that ranks is worth more
 * standing with no boxes on it than not standing at all.
 */
export async function shelfPeek(
  slug: string
): Promise<{ open: boolean; views: BoxView[] }> {
  try {
    const shelf = await occasionBySlug(slug);
    if (!shelf?.active) return { open: false, views: [] };

    // A shelf with a day that has been is not open, whatever admin says:
    // the rest of the shop already stops showing it.
    if (shelf.happens_at && new Date(shelf.happens_at).getTime() < Date.now()) {
      return { open: false, views: [] };
    }

    const boxes = await boxesOf(shelf.id);
    if (boxes.length === 0) return { open: false, views: [] };

    const views = await boxViews(boxes).catch((): BoxView[] => []);
    return { open: views.length > 0, views };
  } catch {
    return { open: false, views: [] };
  }
}
