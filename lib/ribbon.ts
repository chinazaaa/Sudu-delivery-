import { occasionBySlug } from "./boxes";
import type { Settings } from "./settings";

/**
 * The strip along the top, or nothing, once its destination is checked.
 *
 * A banner outlives the thing it advertises. "Liverpool v Man City, box for
 * the match" is a good line until the match has been played, and then it is
 * a shop promising something it cannot sell, pointing at a shelf that has
 * already taken itself down. Timed occasions vanish on their own; the
 * sentence about them did not.
 *
 * So the address is followed before the words are shown. A shelf that has
 * expired, been switched off, or been deleted takes its announcement with
 * it, and the strip disappears rather than sending somebody to an apology.
 *
 * Only a shelf is checked. A link to the menu or a parcel page is a door
 * that is always open, and a strip with no address at all is a claim rather
 * than an offer.
 */
export async function liveRibbon(
  settings: Settings
): Promise<{ text: string; href: string } | null> {
  const text = (settings.ribbon_text ?? "").trim();
  const href = (settings.ribbon_href ?? "").trim();
  if (text === "") return null;
  if (href === "") return { text, href: "" };

  const shelf = href.match(/^\/(?:collections|occasions)\/([a-z0-9-]+)$/i);
  if (!shelf) return { text, href };

  // A database that cannot answer must not silently take the announcement
  // down. Being unable to check is not the same as having checked.
  const occasion = await occasionBySlug(shelf[1]).catch(() => undefined);
  return stillStands(occasion) ? { text, href } : null;
}

/**
 * Whether the shelf a banner points at is still worth pointing at.
 *
 * Its own function because it is the whole rule, and a rule that decides
 * whether the front page lies should be readable in one go and testable
 * without a database.
 *
 * Undefined means the lookup failed rather than came back empty, and that
 * keeps the banner: being unable to check is not the same as having checked.
 */
export function stillStands(
  occasion: { active: boolean; happens_at: string | null } | null | undefined,
  now: number = Date.now()
): boolean {
  if (occasion === undefined) return true;
  if (occasion === null) return false;
  if (!occasion.active) return false;
  if (occasion.happens_at && new Date(occasion.happens_at).getTime() <= now) return false;
  return true;
}
