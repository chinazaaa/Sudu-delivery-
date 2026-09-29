/**
 * A picture for a dish, for the places that must have one.
 *
 * Most of the menu has a photo. Eighty lines do not: a kitchen sends a price
 * list and we put it up the same day. That is fine for a person, who can
 * read the name, but Google reads a product card as broken without an
 * `image` and drops it out of shopping results altogether, which is how two
 * Krispy Kreme doughnuts came back as "Missing field 'image'".
 *
 * So we say the truest picture we have, in order: the dish's own photo, then
 * the kitchen's banner or logo, then the Sudu mark. Never nothing.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";

/** The general one, when there is nothing of the dish or the kitchen. */
export const SUDU_PHOTO = `${SITE}/covers/sudu.png`;

/**
 * Absolute, because structured data is read off the page by something that
 * has no page to resolve a relative path against.
 */
function whole(url: string): string {
  const said = url.trim();
  if (said === "") return "";
  if (said.startsWith("http://") || said.startsWith("https://")) return said;
  return `${SITE}${said.startsWith("/") ? "" : "/"}${said}`;
}

export function photoOf(
  item: { imageUrl?: string | null },
  place?: { bannerUrl?: string | null; logoUrl?: string | null } | null
): string {
  const tries = [
    item?.imageUrl ?? "",
    place?.bannerUrl ?? "",
    place?.logoUrl ?? "",
  ];
  for (const one of tries) {
    const url = whole(String(one ?? ""));
    if (url !== "") return url;
  }
  return SUDU_PHOTO;
}
