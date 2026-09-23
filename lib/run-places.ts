/**
 * The counters a run stops at.
 *
 * Areas say where a car goes. This says which kitchens it fetches from while
 * it is there, for the night that is a Domino's run and nothing else: the
 * driver is queuing at one counter, and a Chicken Republic order on that run
 * is an hour nobody has.
 *
 * Empty means every restaurant, which is what every run is until somebody
 * ticks a box, so a run that has never been touched behaves exactly as it
 * did. Stored the same way areas are, as "|id|id|", so a filter is an exact
 * match on a delimiter rather than a substring that can catch a longer id.
 *
 * Runs only. A car of its own is fetching for one person and can go wherever
 * they asked, and the skincare drop is its own shop, so neither is asked
 * this question.
 */

/** How a run records the counters it stops at. */
export function placesText(ids: string[]): string {
  const real = [...new Set(ids.filter((one) => one.trim() !== ""))];
  return real.length === 0 ? "" : `|${real.join("|")}|`;
}

/** The counters a run stops at. Empty means it is not fussy. */
export function placesOfRun(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("|")
    .map((one) => one.trim())
    .filter((one) => one !== "");
}

/** Whether a run will fetch everything this cart draws on. */
export function runCarries(
  text: string | null | undefined,
  restaurantIds: string[]
): boolean {
  const only = placesOfRun(text);
  if (only.length === 0) return true;
  return restaurantIds.every((id) => only.includes(id));
}
