/**
 * Where a notification should put somebody when they tap it.
 *
 * The shop sends one path for both the website and the app, written the way
 * the website writes it, so an order is "/o/abc" there and "/order/abc" here.
 * Translating in one place means whoever sends a notification does not have to
 * know which of the two is reading it.
 */
const REWRITES: [RegExp, (id: string) => string][] = [
  [/^\/o\/([^/?#]+)/, (id) => `/order/${id}`],
  [/^\/p\/([^/?#]+)/, () => "/"],
];

/**
 * Paths this app has a screen for.
 *
 * The shop can point a notification at anything on the website, and the
 * website grows faster than the app does: boxes exist there and not here
 * yet. Pushing a route that does not exist lands on nothing, which from the
 * outside is a notification that does not work.
 *
 * So anything not on this list is opened on the website instead. A person
 * who tapped gets what they were promised, and the app stops being the
 * reason a campaign fell flat.
 */
const KNOWN = [
  /^\/$/,
  /^\/order\//,
  /^\/r\//,
  /^\/skincare/,
  /^\/occasions/,
  /^\/products/,
  /^\/parcel/,
  /^\/cart/,
  /^\/checkout/,
  /^\/group/,
  /^\/orders/,
];

export function handledInApp(path: string): boolean {
  return KNOWN.some((one) => one.test(path));
}

export function landingFor(path: unknown): string | null {
  if (typeof path !== "string") return null;

  const trimmed = path.trim();
  // Only our own paths. A notification is data from outside, and following an
  // arbitrary URL out of one is how somebody else picks the destination.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  for (const [pattern, rewrite] of REWRITES) {
    const found = trimmed.match(pattern);
    if (found) return rewrite(found[1]) + (trimmed.split("?")[1] ? `?${trimmed.split("?")[1]}` : "");
  }

  return trimmed;
}
