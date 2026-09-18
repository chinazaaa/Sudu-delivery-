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
