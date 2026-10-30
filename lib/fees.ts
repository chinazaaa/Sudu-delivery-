/**
 * Delivery is priced by how much of the car an order fills, not by what the
 * food costs (addendum §1). Containers are countable at a glance at a counter;
 * weight is not, and pricing off value would punish expensive taste.
 *
 * Thresholds are provisional. Set them from what the boot actually holds.
 */
export type Band = {
  maxItems: number;
  fee: number;
  /** On the open top band only: what each item past the band below costs.
   *  Without it the top band is one flat price however much is ordered, so
   *  eleven containers and thirty cost the same to carry. */
  perItem?: number;
};

/**
 * The least one person in a group pays towards the car.
 *
 * A shared delivery divides one band between however many got into the
 * car, so the per head figure falls as the car fills: twelve people on a
 * ten thousand naira band is eight hundred each. The band still covers the
 * trip, so the shop is not out of pocket, but it is also the thinnest
 * margin the shop sells, and twenty people were enough to make the per
 * head price an advert for ordering no other way.
 *
 * So there is a floor under it. Never above the whole fee, because nobody
 * in a car should pay more than the car costs.
 *
 * A default, not a rule: Settings has the number.
 */
export const GROUP_FLOOR = 1200;

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
    const raw = JSON.parse(json) as {
      maxItems: number | null;
      fee: number;
      perItem?: number;
    }[];
    const bands = raw
      .filter((band) => Number.isFinite(band.fee) && band.fee >= 0)
      .map((band) => ({
        maxItems:
          band.maxItems === null || !Number.isFinite(band.maxItems)
            ? Infinity
            : Math.max(1, Math.round(band.maxItems)),
        fee: Math.round(band.fee),
        perItem:
          Number.isFinite(band.perItem) && (band.perItem as number) > 0
            ? Math.round(band.perItem as number)
            : undefined,
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
      ...(band.perItem && band.perItem > 0 ? { perItem: band.perItem } : {}),
    }))
  );
}

/**
 * A flash drop lowers the entry fee for one batch without making a car-load
 * cheap to carry: every band moves down by the same amount, so "₦2,000
 * delivery tonight" is true, and twelve containers still pay for twelve
 * containers (addendum §4).
 */
/**
 * The ladder price before any flash drop.
 *
 * The top band catches everything above it, which for a flat price means
 * eleven containers and thirty cost the same to carry. Where a price per item
 * is set on it, the top band stops being flat: the last real band is the
 * base, and each item past it adds that much. Eleven items is ten items and
 * five hundred, which is what anybody would guess it should be.
 */
function baseFee(itemCount: number, bands: Band[]): number {
  const top = bands[bands.length - 1];
  const below = bands[bands.length - 2];

  if (
    top?.perItem &&
    top.perItem > 0 &&
    below &&
    Number.isFinite(below.maxItems) &&
    itemCount > below.maxItems
  ) {
    return below.fee + (itemCount - below.maxItems) * top.perItem;
  }

  return bandFor(itemCount, bands).fee;
}

export function feeFor(
  itemCount: number,
  flashFee?: number | null,
  bands: Band[] = FEE_BANDS
): number {
  const banded = baseFee(Math.max(itemCount, 1), bands);
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

/**
 * A shared delivery, split evenly and rounded to something payable.
 *
 * The band is set by everything in the car, then divided by however many
 * people are in it. Rounding is up, to the nearest hundred naira, because a
 * share of ₦3,333 is a number nobody wants to type into a banking app, and
 * because rounding down would leave the shop short of the band it has to pay
 * to run the car.
 *
 * Every share is the same. Somebody who ordered one thing pays what somebody
 * who ordered five pays, which is the deal they agreed to when they got into
 * the same car.
 */
export function evenShare(
  items: number,
  people: number,
  flashFee: number | null = null,
  bands?: Band[],
  /** The least anybody pays towards the car. Nothing by default, so a
   *  caller that has not read the setting prices it the old way rather
   *  than inventing a floor of its own. */
  floor = 0
): number {
  if (people < 1) return 0;
  const band = feeFor(items, flashFee, bands);
  return perHead(band, people, floor);
}

/**
 * One car's fee, divided and then floored.
 *
 * Rounding is up, to the nearest hundred naira, because a share of ₦3,333
 * is a number nobody wants to type into a banking app, and because
 * rounding down would leave the shop short of the band it has to pay to
 * run the car. The floor goes on after that, and the whole fee caps it:
 * a share worth more than the entire trip is not a share.
 */
export function perHead(whole: number, people: number, floor = 0): number {
  if (people < 1) return whole;
  const even = Math.ceil(whole / people / 100) * 100;
  return Math.min(whole, Math.max(even, Math.max(0, floor)));
}

/**
 * Same day delivery, which is a different business from the batched runs.
 *
 * A run carries everybody's food in one car, which is why it is cheap. Same
 * day is a car going out for one order at a time somebody chose, so it is
 * priced on its own ladder: the same steps, two thousand higher, and two
 * thousand higher again when there is not enough notice to fold the trip into
 * anything else.
 */
export const SAME_DAY_BANDS: Band[] = [
  { maxItems: 4, fee: 6500 },
  { maxItems: 6, fee: 8500 },
  { maxItems: 10, fee: 10500 },
  { maxItems: Infinity, fee: 12500 },
];

/** What being inside the five hours adds, on every step of the ladder. */
export const URGENT_EXTRA = 2000;

/** How much notice a same day order needs before it stops being urgent. */
export const URGENT_HOURS = 5;

/**
 * How long it actually takes: to the restaurant, wait for the food, drive it
 * to campus. Nothing sooner than this can be offered, however much somebody
 * would like it, because offering it is promising it.
 */
export const DELIVERY_LEAD_HOURS = 3;

/** What the last delivery of the day is, because nothing goes out after it. */
export const LAST_DELIVERY_HOUR = 18;

/**
 * The latest a shared run ever delivers.
 *
 * Later than the same-day hour above, and deliberately a different number:
 * that one is the last time a car will go out for one person, where three
 * hours has to cover fetching and driving. A run is already going, so it
 * delivers later than the last car anybody can summon.
 */
export const RUN_LAST_HOUR = 19;

/** The first hour of the day a same day delivery can be asked for. */
export const FIRST_DELIVERY_HOUR = 12;

/**
 * Less than five hours between asking and wanting it. Ordering at 9 for noon
 * is urgent; ordering at 9 for three o'clock is not.
 */
export function isUrgent(wantedAt: Date, now: Date = new Date()): boolean {
  return wantedAt.getTime() - now.getTime() < URGENT_HOURS * 3_600_000;
}

/**
 * What a same day delivery costs. Urgent is the same ladder again with two
 * thousand on every step, because a car that cannot wait is a car doing
 * nothing else.
 */
export function sameDayFee(
  itemCount: number,
  urgent: boolean,
  bands: Band[] = SAME_DAY_BANDS,
  urgentExtra: number = URGENT_EXTRA
): number {
  return bandFor(itemCount, bands).fee + (urgent ? urgentExtra : 0);
}

/**
 * What one trip's delivery costs, whichever kind of trip it is.
 *
 * The shop runs two sorts and they are priced differently on purpose: a
 * run goes out on a timetable with everybody's food in one boot, and a car
 * of its own goes when somebody asks, with an extra on top for asking at
 * an hour's notice. Different trips, different ladders.
 *
 * Every place that needed a fee used to pick a ladder for itself, and the
 * places that forgot to ask which trip it was simply used the run's. That
 * is how moving an order onto a car turned a ten thousand naira delivery
 * into six, and how a free-delivery code on a car took off the wrong
 * amount. Nothing announced either: a fee that is too low looks exactly
 * like a fee.
 *
 * So there is one question and one answer. Callers say what the trip is
 * and how much is going on it; this says what it costs. The two ladders
 * stay where they are and keep their own rules; what goes is the chance
 * to consult the wrong one.
 */
export type Trip = {
  /** "same_day" is a car of its own. Anything else rides a run. */
  kind?: string | null;
  /** A run's one-off flash price, where it has one. */
  flash_fee?: number | null;
};

export const isCar = (trip: Trip | null | undefined): boolean =>
  String(trip?.kind ?? "") === "same_day";

export function tripFee(
  trip: Trip | null | undefined,
  items: number,
  ladders: {
    run: Band[];
    car: Band[];
    urgentExtra: number;
    /** Only ever true where the customer chose an urgent slot. Never on a
     *  move: that is the shop rearranging itself, and billing somebody for
     *  that is billing them for your convenience. */
    urgent?: boolean;
  }
): number {
  if (isCar(trip)) {
    return sameDayFee(items, ladders.urgent === true, ladders.car, ladders.urgentExtra);
  }
  return feeFor(items, trip?.flash_fee ?? null, ladders.run);
}

/**
 * Which rung an order of this many containers lands on, or -1 for none.
 *
 * For the meter at the top of the cart: how full the car is, and how much
 * more fits before the fee goes up. The app has drawn this for a while and
 * the website had nothing like it, so the one number people are actually
 * deciding about was at the bottom of the page under the food.
 */
export function bandIndex(bands: Band[], items: number): number {
  if (items <= 0) return -1;
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const found = ladder.findIndex(
    (step) => step.maxItems !== null && items <= step.maxItems
  );
  return found === -1 ? ladder.length - 1 : found;
}
