/**
 * Delivery priced by what the shopping comes to, rather than by how many
 * things it is.
 *
 * A restaurant's ladder counts containers, because a car carrying twelve
 * takeaway boxes is a different car from one carrying two. A market is not
 * like that: eleven peppers and a bag of rice is one trip and two bags, and
 * counting them as eleven containers charges somebody nine thousand naira to
 * be brought their vegetables.
 *
 * What actually costs more at a market is bulk, and the honest measure of
 * bulk is the money: thirty thousand naira of shopping is a boot full, and
 * two thousand is a carrier bag. So these bands go by value.
 */
export type ValueBand = {
  /** The most this band covers, in naira. Infinity on the last one, which
   *  has to catch everything or a big shop prices as nothing. */
  upTo: number;
  fee: number;
};

export function parseValueBands(json: string | null | undefined): ValueBand[] {
  if (!json || !json.trim()) return [];
  try {
    const raw = JSON.parse(json) as { upTo: number | null; fee: number }[];
    const bands = raw
      .filter((band) => Number.isFinite(band.fee) && band.fee >= 0)
      .map((band) => ({
        upTo:
          band.upTo === null || !Number.isFinite(band.upTo)
            ? Infinity
            : Math.max(0, Math.round(band.upTo)),
        fee: Math.round(band.fee),
      }))
      .sort((a, b) => a.upTo - b.upTo);

    if (bands.length === 0) return [];
    // The last band catches everything above it, whatever was typed.
    bands[bands.length - 1] = { ...bands[bands.length - 1], upTo: Infinity };
    return bands;
  } catch {
    return [];
  }
}

export function serialiseValueBands(bands: ValueBand[]): string {
  return JSON.stringify(
    bands.map((band) => ({
      upTo: Number.isFinite(band.upTo) ? band.upTo : null,
      fee: band.fee,
    }))
  );
}

/** What this much shopping costs to bring. */
export function feeForValue(value: number, bands: ValueBand[]): number {
  if (bands.length === 0) return 0;
  const found = bands.find((band) => value <= band.upTo);
  return (found ?? bands[bands.length - 1]).fee;
}

/**
 * Said the way it reads on a page: "up to ₦30,000" and then "over ₦30,000".
 *
 * The last band has no ceiling, so describing it as a range would be a lie
 * about the top of it.
 */
export function bandRange(
  bands: ValueBand[],
  at: number
): { from: number; upTo: number } {
  return { from: at === 0 ? 0 : bands[at - 1].upTo + 1, upTo: bands[at].upTo };
}
