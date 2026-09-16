/**
 * Delivery is priced by how much of the car an order fills, not by what the
 * food costs (addendum §1). Containers are countable at a glance at a counter;
 * weight is not, and pricing off value would punish expensive taste.
 *
 * Thresholds are provisional — set them from what the boot actually holds.
 */
export const FEE_BANDS: { maxItems: number; fee: number }[] = [
  { maxItems: 3, fee: 4000 },
  { maxItems: 6, fee: 6000 },
  { maxItems: 10, fee: 8000 },
  { maxItems: Infinity, fee: 10000 },
];

/** The number quoted against UniOrdering's ₦6,500 and repeated between students. */
export const HEADLINE_FEE = FEE_BANDS[0].fee;

export function bandFor(itemCount: number): { maxItems: number; fee: number } {
  return FEE_BANDS.find((band) => itemCount <= band.maxItems) ?? FEE_BANDS[FEE_BANDS.length - 1];
}

/**
 * A flash drop lowers the entry fee for one batch without making a car-load
 * cheap to carry: every band moves down by the same amount, so "₦2,000
 * delivery tonight" is true, and twelve containers still pay for twelve
 * containers (addendum §4).
 */
export function feeFor(itemCount: number, flashFee?: number | null): number {
  const banded = bandFor(Math.max(itemCount, 1)).fee;
  if (flashFee === null || flashFee === undefined) return banded;
  return Math.max(0, flashFee + (banded - HEADLINE_FEE));
}

/** What the bands look like under a flash drop — shown to the admin before saving. */
export function bandTable(flashFee?: number | null): { label: string; fee: number }[] {
  return FEE_BANDS.map((band, index) => {
    const from = index === 0 ? 1 : FEE_BANDS[index - 1].maxItems + 1;
    const label = band.maxItems === Infinity ? `${from}+ items` : `${from}–${band.maxItems} items`;
    return { label, fee: feeFor(from, flashFee) };
  });
}

/** How many more containers before the fee steps up, for an honest nudge. */
export function nextBand(
  itemCount: number
): { itemsAway: number; fee: number } | null {
  const current = bandFor(itemCount);
  const index = FEE_BANDS.indexOf(current);
  const next = FEE_BANDS[index + 1];
  if (!next || current.maxItems === Infinity) return null;
  return { itemsAway: current.maxItems - itemCount + 1, fee: next.fee };
}

/**
 * Splits one group's fee across its payers in proportion to what each person
 * ordered, with the shares summing exactly to the fee. Any rounding remainder
 * lands on the largest orders, which is where it is least noticeable.
 */
export function splitFee(fee: number, counts: number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);

  const exact = counts.map((count) => (fee * count) / total);
  const shares = exact.map(Math.floor);
  let remainder = fee - shares.reduce((sum, share) => sum + share, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; remainder > 0; i = (i + 1) % order.length) {
    shares[order[i].index] += 1;
    remainder -= 1;
  }
  return shares;
}
