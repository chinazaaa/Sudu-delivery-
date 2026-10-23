/**
 * What it costs to go and get the food, and what to put on the card.
 *
 * Customers transfer into the shop's own account. The counters are paid
 * with a card somebody else is holding, so before a run goes out the shop
 * has to move money onto that card: what the counters will charge, plus
 * the fare for the trip. Whatever is left in the account afterwards is the
 * shop's.
 *
 * The fare is a round trip and it depends on where the food is, not on
 * where it is going: every run ends at PAU. Sangotedo and back is one
 * figure, Lekki and back is another, and a run that stops at both is a
 * third, which is not the two added. So it is a table somebody fills in
 * rather than arithmetic: nobody can derive a Lagos fare from a map.
 */
export type Fare = {
  /** The areas this trip covers, by id. Empty id is home. */
  areas: string[];
  /** What the round trip costs, in naira. */
  amount: number;
};

/** Areas in a fixed order, so a lookup does not depend on how they arrived. */
const key = (areas: string[]): string =>
  [...new Set(areas.map((one) => String(one ?? "").trim()))].sort().join("\t");

export function parseFares(json: string | null | undefined): Fare[] {
  if (!json || !json.trim()) return [];
  try {
    const raw = JSON.parse(json) as Fare[];
    return raw
      .map((one) => ({
        areas: Array.isArray(one?.areas)
          ? [...new Set(one.areas.map((a) => String(a ?? "").trim()))]
          : [],
        amount: Math.max(0, Math.round(Number(one?.amount) || 0)),
      }))
      // A fare for no areas at all is not a trip. A fare of nought is: a
      // drop made on the way home costs nothing and saying so is worth
      // more than leaving the shop to guess.
      .filter((one) => one.areas.length > 0);
  } catch {
    // A row nobody can read is a shop with no fares typed in, which is how
    // it worked before anybody typed one.
    return [];
  }
}

export function serialiseFares(fares: Fare[]): string {
  const real = fares.filter((one) => one.areas.length > 0);
  return real.length === 0
    ? ""
    : JSON.stringify(
        real.map((one) => ({
          areas: [...new Set(one.areas.map((a) => String(a ?? "").trim()))].sort(),
          amount: Math.max(0, Math.round(Number(one.amount) || 0)),
        }))
      );
}

export type FareFound = {
  amount: number;
  /** Whether this is the fare for exactly these areas, or the nearest
   *  thing to it. A guess is said as a guess. */
  exact: boolean;
};

/**
 * What the trip to these areas costs.
 *
 * The table first, by the exact set of areas: a run stopping in Sangotedo
 * and Ajah is its own trip with its own fare, and adding the two singles
 * would be charging for two journeys that were one.
 *
 * Where nobody has priced that combination, the dearest of the areas it
 * does cover, said as a guess. It is the honest shape of the thing: a trip
 * is about as expensive as its furthest leg, and a figure somebody can see
 * is wrong beats a blank on the screen where the money is decided.
 */
export function fareFor(areas: string[], table: Fare[]): FareFound {
  const wanted = [...new Set(areas.map((one) => String(one ?? "").trim()))];
  if (wanted.length === 0 || table.length === 0) return { amount: 0, exact: false };

  const exact = table.find((one) => key(one.areas) === key(wanted));
  if (exact) return { amount: exact.amount, exact: true };

  // The dearest fare among the trips made of these areas alone. A run that
  // stops in Sangotedo and Ajah, where only the singles are priced, is at
  // least as dear as the dearer of them.
  let most = 0;
  for (const one of table) {
    if (!one.areas.every((area) => wanted.includes(area))) continue;
    if (one.amount > most) most = one.amount;
  }
  return { amount: most, exact: false };
}

/**
 * What to move onto the card before the run goes out.
 *
 * The counters and the fare, which is the whole of what leaves the card.
 * Said as one figure because that is what gets typed into a transfer.
 */
export function putOnCard(args: { counters: number; fare: number }): number {
  return Math.max(0, Math.round(args.counters)) + Math.max(0, Math.round(args.fare));
}
