/**
 * Where somebody came from, and who sent them.
 *
 * Two different questions, kept apart on purpose:
 *
 *   - the CHANNEL: Google, Instagram, WhatsApp, a poster. Where they were
 *     standing when they saw us. Worked out from a utm_source on the link
 *     when there is one, and from the referring site when there is not.
 *   - the PROMOTER: a person, who gets paid. That already has a home in
 *     promoters.code, and it must never be guessed from a referrer.
 *
 * Both are first touch and both last ninety days in a cookie, because the
 * thing that introduced somebody introduced them once. A second order is
 * not Instagram's doing.
 */

/** The channel, as a cookie the checkout can read on the server. */
export const FROM_COOKIE = "sudu_from";
/** The promoter whose link they came in through. */
export const WHO_COOKIE = "sudu_who";
/** Ninety days. Long enough to cover a term, short enough to expire. */
export const REMEMBER_FOR = 60 * 60 * 24 * 90;

/** Only ever these, so a year of orders can be counted without cleaning up. */
const KNOWN = [
  "google",
  "instagram",
  "whatsapp",
  "tiktok",
  "facebook",
  "twitter",
  "snapchat",
  "youtube",
  "telegram",
  "linkedin",
  "bing",
  "email",
  "poster",
  "flyer",
  "promoter",
  "app",
  "direct",
] as const;

/** Which site sent them, by hostname. */
const SITES: [RegExp, string][] = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "bing"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)l\.instagram\.com$/, "instagram"],
  [/(^|\.)facebook\.com$/, "facebook"],
  [/(^|\.)fb\.(com|me)$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)youtube\.com$/, "youtube"],
  [/(^|\.)youtu\.be$/, "youtube"],
  [/(^|\.)(x|twitter)\.com$/, "twitter"],
  [/(^|\.)t\.co$/, "twitter"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)lnkd\.in$/, "linkedin"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "whatsapp"],
  [/(^|\.)(t\.me|telegram\.(me|org))$/, "telegram"],
  [/(^|\.)mail\./, "email"],
];

/**
 * Tidied to one of the known names, or "" for something we do not recognise.
 *
 * Thrown away rather than kept as typed: a column that holds Instagram,
 * instagram, IG and ig-bio is four columns pretending to be one, and no
 * amount of counting afterwards puts them back together.
 */
export function tidyChannel(said: string): string {
  // Taken a word at a time, so a link tagged ig-bio or instagram_story lands
  // under Instagram rather than under nothing. Whoever writes the link is
  // usually adding where on Instagram it went, not naming a new channel.
  const words = String(said ?? "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  for (const word of words) {
    const named = nameOf(word);
    if (named !== "") return named;
  }
  return "";
}

/** One word, as one of ours or as nothing. */
function nameOf(word: string): string {
  if (word === "ig") return "instagram";
  if (word === "wa" || word === "wapp") return "whatsapp";
  if (word === "fb") return "facebook";
  if (word === "yt") return "youtube";
  if (word === "x") return "twitter";
  if (word === "gmail" || word === "mail") return "email";
  return (KNOWN as readonly string[]).includes(word) ? word : "";
}

/** The channel a referring hostname implies, or "" for one of our own. */
export function channelOfSite(host: string): string {
  const name = String(host ?? "").trim().toLowerCase();
  if (name === "") return "";
  for (const [pattern, channel] of SITES) {
    if (pattern.test(name)) return channel;
  }
  return "";
}

/** Every name that can end up in the column, for a dropdown in admin. */
export function everyChannel(): string[] {
  return [...KNOWN];
}

/** "Instagram", "Google", "WhatsApp": the way it is written down for a person. */
export function channelLabel(channel: string): string {
  const name = String(channel ?? "").trim();
  if (name === "") return "Not known";
  if (name === "whatsapp") return "WhatsApp";
  if (name === "tiktok") return "TikTok";
  if (name === "youtube") return "YouTube";
  if (name === "linkedin") return "LinkedIn";
  if (name === "app") return "The app";
  if (name === "promoter") return "A promoter's link";
  if (name === "direct") return "Typed it in";
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * What a promoter's short link may be called.
 *
 * Letters and numbers, lower case, because it is going into an address that
 * somebody reads out loud. "ada", not "Ada's Link (2)".
 */
export function tidyHandle(said: string): string {
  return String(said ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}
