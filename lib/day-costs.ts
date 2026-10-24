/**
 * What a day's driving cost, typed once.
 *
 * Costs live on a batch, which was right while a batch was a trip. It is
 * not one any more: a scheduled run and a car of its own on one evening
 * are one drive, and the fare is one fare. Asking for it per batch asks
 * for it twice, and typing it twice is not extra typing, it is the day's
 * costs counted twice and a profit figure that is wrong by a whole fare.
 *
 * So it is typed once for the day and shared out across the batches that
 * made it up, because that is where every sum in the shop already reads
 * costs from. Per bag, so a run carrying five of the day's six bags
 * carries five sixths of the fare, which is as near as anything gets to
 * what that half of the evening really cost. The pennies left over by the
 * division go to the biggest, so the parts add back up to the whole.
 */
export type DayCost = {
  fuel: number;
  transport: number;
  driver: number;
  other: number;
};

export type CostShare = DayCost & { id: string };

/**
 * One figure split across the day's batches, by how many bags each is
 * carrying. Nothing is lost: what the parts come to is what was typed.
 */
export function shareOut(total: number, bags: number[]): number[] {
  const whole = Math.max(0, Math.round(total));
  const all = bags.reduce((sum, one) => sum + Math.max(0, one), 0);
  if (whole === 0 || bags.length === 0) return bags.map(() => 0);

  // Nothing is carrying anything: split it evenly rather than dropping it.
  const weights = all === 0 ? bags.map(() => 1) : bags.map((one) => Math.max(0, one));
  const sum = weights.reduce((a, b) => a + b, 0);

  const parts = weights.map((one) => Math.floor((whole * one) / sum));
  let left = whole - parts.reduce((a, b) => a + b, 0);

  // The remainder to the biggest first, so the one carrying most of the
  // evening carries the odd naira too.
  const order = weights
    .map((one, at) => ({ one, at }))
    .sort((a, b) => b.one - a.one || a.at - b.at);
  for (const { at } of order) {
    if (left <= 0) break;
    parts[at] += 1;
    left -= 1;
  }
  return parts;
}

/** The whole day's costs split across its batches. */
export function splitDayCosts(
  day: DayCost,
  parts: { id: string; bags: number }[]
): CostShare[] {
  const bags = parts.map((one) => one.bags);
  const fuel = shareOut(day.fuel, bags);
  const transport = shareOut(day.transport, bags);
  const driver = shareOut(day.driver, bags);
  const other = shareOut(day.other, bags);

  return parts.map((one, at) => ({
    id: one.id,
    fuel: fuel[at],
    transport: transport[at],
    driver: driver[at],
    other: other[at],
  }));
}

/** What the day has been told already, for the boxes to open on. */
export function dayCostSoFar(
  parts: { fuel: number; transport: number; driver: number; other: number }[]
): DayCost {
  return {
    fuel: parts.reduce((sum, one) => sum + one.fuel, 0),
    transport: parts.reduce((sum, one) => sum + one.transport, 0),
    driver: parts.reduce((sum, one) => sum + one.driver, 0),
    other: parts.reduce((sum, one) => sum + one.other, 0),
  };
}
