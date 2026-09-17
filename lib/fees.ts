/**
 * Delivery is priced by how much of the car an order fills, not by what the
 * food costs (addendum §1). Containers are countable at a glance at a counter;
 * weight is not, and pricing off value would punish expensive taste.
 *
 * Thresholds are provisional. Set them from what the boot actually holds.
 */
export type Band = { maxItems: number; fee: number };

/** The bands until the admin sets their own in settings. */
export const FEE_BANDS: Band[] = [
  { maxItems: 3, fee: 4000 },
  { maxItems: 6, fee: 6000 },
  { maxItems: 10, fee: 8000 },
  { maxItems: Infinity, fee: 10000 },
];

/** The number quoted against UniOrdering's ₦6,500 and repeated between students. */
export const HEADLINE_FEE = FEE_BANDS[0].fee;

export function bandFor(itemCount: number, bands: Band[] = FEE_BANDS): Band {
  return bands.find((band) => itemCount <= band.maxItems) ?? bands[bands.length - 1];
}

/** The number quoted out loud, whatever the bands have been changed to. */
export function headlineFee(bands: Band[] = FEE_BANDS): number {
  return bands[0].fee;
}

/**
 * Bands as they are kept in settings: JSON, with the open-ended top band
 * written as null rather than Infinity, which JSON cannot hold. Anything
 * malformed falls back to the defaults, because a broken row must never stop
 * the shop pricing an order.
 */
export function parseBands(json: string | null | undefined): Band[] {
  if (!json || !json.trim()) return FEE_BANDS;
  try {
    const raw = JSON.parse(json) as { maxItems: number | null; fee: number }[];
    const bands = raw
      .filter((band) => Number.isFinite(band.fee) && band.fee >= 0)
      .map((band) => ({
        maxItems:
          band.maxItems === null || !Number.isFinite(band.maxItems)
            ? Infinity
            : Math.max(1, Math.round(band.maxItems)),
        fee: Math.round(band.fee),
      }))
      .sort((a, b) => a.maxItems - b.maxItems);

    if (bands.length === 0) return FEE_BANDS;
    // The last band has to catch everything, or a big order prices as null.
    bands[bands.length - 1] = { ...bands[bands.length - 1], maxItems: Infinity };
    return bands;
  } catch {
    return FEE_BANDS;
  }
}

/** Bands written back out for storage, with the open top band as null. */
export function serialiseBands(bands: Band[]): string {
  return JSON.stringify(
    bands.map((band) => ({
      maxItems: Number.isFinite(band.maxItems) ? band.maxItems : null,
      fee: band.fee,
    }))
  );
}

/**
 * A flash drop lowers the entry fee for one batch without making a car-load
 * cheap to carry: every band moves down by the same amount, so "₦2,000
 * delivery tonight" is true, and twelve containers still pay for twelve
 * containers (addendum §4).
 */
export function feeFor(
  itemCount: number,
  flashFee?: number | null,
  bands: Band[] = FEE_BANDS
): number {
  const banded = bandFor(Math.max(itemCount, 1), bands).fee;
  if (flashFee === null || flashFee === undefined) return banded;
  return Math.max(0, flashFee + (banded - headlineFee(bands)));
}

/** What the bands look like under a flash drop, shown to the admin before saving. */
export function bandTable(
  flashFee?: number | null,
  bands: Band[] = FEE_BANDS
): { label: string; fee: number }[] {
  return bands.map((band, index) => {
    const from = index === 0 ? 1 : bands[index - 1].maxItems + 1;
    const label = band.maxItems === Infinity ? `${from}+ items` : `${from}-${band.maxItems} items`;
    return { label, fee: feeFor(from, flashFee, bands) };
  });
}

/** How many more containers before the fee steps up, for an honest nudge. */
export function nextBand(
  itemCount: number,
  bands: Band[] = FEE_BANDS
): { itemsAway: number; fee: number } | null {
  const current = bandFor(itemCount, bands);
  const index = bands.indexOf(current);
  const next = bands[index + 1];
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
