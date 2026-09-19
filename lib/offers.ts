import { naira } from "./money";

/**
 * Promotions, judged against a cart.
 *
 * Kept away from anything that touches the database on purpose: the checkout
 * runs this in somebody's browser and the order runs it on the server, and
 * they have to agree. A fee quoted on one screen and charged on the next has
 * to be one number, and the only way to be sure of that is one function.
 */

/**
 * A promotion with its rules attached, ready to be judged against a cart.
 *
 * The judging is a pure function below, and this is what it needs. Both the
 * checkout in the browser and the order being placed on the server run that
 * same function on this same shape, because a delivery fee quoted on one
 * screen and charged on another has to be the same number.
 */
export type LiveOffer = {
  code: string;
  note: string;
  fee: number;
  includedItems: number | null;
  extraPerItem: number;
  /** Empty means anywhere. */
  places: string[];
  /** Particular dishes this is for, with any categories already resolved to
   *  their dishes. Empty means it is not about dishes at all. */
  items: string[];
  /** The choices a line has to have made, as the menu groups them: one set
   *  per question the dish asks. Within a set any of them will do, and every
   *  set has to be answered, so a medium BBQ Chicken or a medium BBQ Meatball
   *  both qualify and a large one does not. Empty means the offer does not
   *  care what was chosen. */
  choice: string;
  /** Empty means any run. */
  runs: string[];
  /** Whether it reaches a same day car at all. Off is the safe answer: a
   *  flat price that replaces a car somebody has to themselves is driving at
   *  a loss rather than discounting. */
  sameDay: boolean;

  firstOrderOnly: boolean;
  /** In a group the fee splits, but never below this each. */
  minEach: number;
};

export type OfferContext = {
  restaurantIds: string[];
  /** Every dish in the cart, for an offer that is about particular ones. */
  itemIds?: string[];
  /** The choices made on each line, by name, for an offer about a size. One
   *  entry per line, so a cart with a large and a small is two entries. */
  lineChoices?: string[][];
  items: number;
  batchId: string;
  deliverAt?: string | null;
  returning: boolean;
};

/**
 * The promotion this cart has earned, and what delivery costs under it.
 *
 * Whole cart or nothing: an offer for one counter is an offer for one trip,
 * and a cart with somebody else's food in it is two stops. It stands down
 * rather than half applying, and the ordinary ladder prices the order.
 */
export function pickOffer(
  offers: LiveOffer[],
  context: OfferContext
): { offer: LiveOffer; fee: number } | null {
  const cart = [...new Set(context.restaurantIds)];
  const earned: { offer: LiveOffer; fee: number }[] = [];

  for (const offer of offers) {
    if (offer.firstOrderOnly && context.returning) continue;
    if (offer.places.length > 0) {
      if (cart.length === 0 || cart.some((id) => !offer.places.includes(id))) continue;
    }
    // An offer for particular dishes is earned by those dishes. Two of them
    // together still earn it; anything else in the cart does not, because it
    // was the dish that was worth the trip and not whatever rode along.
    if (offer.items.length > 0) {
      const dishes = context.itemIds ?? [];
      if (dishes.length === 0 || dishes.some((id) => !offer.items.includes(id))) continue;
    }
    // A size, which is a choice on a dish rather than a dish of its own. Every
    // line has to have made it: a large and a small together is not an offer
    // on large ones.
    if (offer.choice !== "" && !everyLineChose(offer.choice, context.lineChoices)) continue;
    if (offer.runs.length > 0 && !offer.runs.includes(context.batchId)) continue;
    // A same day car is a trip for one person. An offer only reaches one
    // when it says so, because the flat price that makes sense shared across
    // a run does not cover a car going out for one order.
    if (context.deliverAt && !offer.sameDay) continue;

    earned.push({ offer, fee: offerFee(offer, context.items) });
  }

  if (earned.length === 0) return null;

  // Two offers can be on at once, and a cart can qualify for both. The
  // cheaper one wins rather than whichever the database happened to return
  // first, because the alternative is a price that changes for no reason
  // anybody can see.
  return earned.sort(
    (one, two) => one.fee - two.fee || one.offer.code.localeCompare(two.offer.code)
  )[0];
}

/**
 * What a promotion charges for this much food.
 *
 * Flat is the headline, and the taper is the boot: two thousand covers three
 * items, and the fourth costs five hundred like the fourth of anything else.
 * A cliff would have been simpler to write and worse to be on the wrong side
 * of, because an offer that silently stops applying reads as a bug.
 */
export function offerFee(offer: LiveOffer, items: number): number {
  if (offer.includedItems === null || offer.extraPerItem <= 0) return offer.fee;
  return offer.fee + Math.max(0, items - offer.includedItems) * offer.extraPerItem;
}


/**
 * The offer as it is actually being charged, for the car that is under it.
 *
 * The note on its own says the headline, and when the taper has bitten the
 * headline is not the number on the screen: "Domino's 2k" next to ₦1,500 each
 * with four items in the bag looks like the sum is wrong. Naming the extra
 * makes the figure add up in front of them.
 */
export function offerNote(offer: LiveOffer, items: number): string {
  const note = offer.note.trim();
  if (offer.includedItems === null || offer.extraPerItem <= 0) return note;

  const over = Math.max(0, items - offer.includedItems);
  if (over === 0) return note;

  const extra = over * offer.extraPerItem;
  return `${note} plus ${naira(extra)} for the ${over} item${
    over === 1 ? "" : "s"
  } over ${offer.includedItems}`;
}

/**
 * The offer in a few words, for a badge on a card.
 *
 * It says the price rather than teasing one. "Promo inside" makes somebody
 * tap to find out whether it is worth anything; the number is the reason to
 * tap, so it goes on the outside.
 */
export function offerBadge(offer: LiveOffer): string {
  return offer.fee === 0 ? "Free delivery" : `${naira(offer.fee)} delivery`;
}

/** The same offer said properly, for the banner on a restaurant's page. */
export function offerLine(offer: LiveOffer): string {
  if (offer.fee === 0) return "Delivery is free.";
  const taper =
    offer.includedItems !== null && offer.extraPerItem > 0
      ? ` for up to ${offer.includedItems} item${offer.includedItems === 1 ? "" : "s"}, then ${naira(offer.extraPerItem)} each`
      : ", however much you order";
  return `Delivery is ${naira(offer.fee)}${taper}.`;
}

/**
 * What each person in a car pays under a promotion.
 *
 * The offer is for the trip, so it splits: one person pays all of it, two pay
 * half each. The floor is what stops it running to nothing as a group grows,
 * because the counter and the drive cost the same whether five people or
 * twenty are waiting for the bags.
 *
 * Rounded up to the hundred like every other share, so the shop is never left
 * short of the fee it has to cover.
 */
export function offerShare(offer: LiveOffer, items: number, people: number): number {
  if (people < 1) return 0;
  const whole = offerFee(offer, items);
  return Math.max(Math.ceil(whole / people / 100) * 100, offer.minEach);
}

/**
 * Whether every line in the cart made this choice.
 *
 * By name, because each dish carries its own copy of its options and there is
 * no one Large to point at. Compared without case or surrounding space, since
 * "large" and "Large " are the same answer to anybody reading a menu.
 */
export function everyLineChose(choice: string, lines: string[][] | undefined): boolean {
  const wanted = choiceSets(choice);
  if (wanted.length === 0) return true;
  if (!lines || lines.length === 0) return false;

  // Every set has to be answered by the line, and any one within a set will
  // do. Ticking Medium and then two BBQ flavours is two questions, not one
  // list of three: it means a medium, and one of those two, which is what
  // anybody ticking them meant.
  return lines.every((chosen) => {
    const made = chosen.map((one) => one.trim().toLowerCase());
    return wanted.every((set) => set.some((one) => made.includes(one)));
  });
}

/**
 * The choices an offer asks for, as sets.
 *
 * Stored as JSON, one array per question the dish asks. An older offer that
 * saved a plain comma list is read as a single set, which is what it meant.
 */
export function choiceSets(choice: string): string[][] {
  return readChoice(choice).map((set) =>
    set.map((one) => optionName(one).toLowerCase())
  );
}

/**
 * The stored choice, parsed, or nothing at all if it does not make sense.
 *
 * A value written by an older version, or by a bug, has to end here rather
 * than halfway into a sentence a customer reads. Anything that is not plainly
 * a list of names is treated as no choice at all, which prices the offer a
 * little wider than intended and says nothing strange to anybody.
 */
function readChoice(choice: string): string[][] {
  const raw = choice.trim();
  if (raw === "") return [];

  // Brackets and braces are the shape of a value that has been written by a
  // bug rather than by a menu. A quotation mark is not: a size on this menu
  // is called Medium 12", and refusing that would refuse the real thing.
  const sane = (one: unknown): one is string =>
    typeof one === "string" && one.trim() !== "" && !/[[\]{}]/.test(one);

  // Only the proper shape is trusted. A version that lived for about an hour
  // wrote a plain comma list, and one of those went wrong badly enough to
  // print a sentence of brackets and quotation marks into what a customer
  // read. Anything that is not a list of lists is no choice at all, which
  // prices the offer a little wider and says nothing strange to anybody.
  if (!raw.startsWith("[")) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((set): set is unknown[] => Array.isArray(set))
      .map((set) => set.filter(sane).map((one) => one.trim()))
      .filter((set) => set.length > 0);
  } catch {
    return [];
  }
}

export type CartItem = {
  itemId: string;
  restaurantId: string;
  name: string;
  choices: string[];
};

export type NearMiss = {
  offer: LiveOffer;
  /** What delivery would cost if the rest went. */
  fee: number;
  /** What is in the way, by name, without repeats. */
  blocking: string[];
  /** What the offer does cover, by name, without repeats. With a full cart
   *  it reads better to name the two things that qualify than the six that
   *  do not. */
  qualifying: string[];
};

/**
 * An offer this cart nearly has.
 *
 * Something in the cart qualifies and something else stops it, which from the
 * inside looks like the offer simply not working. Saying which is which turns
 * that into a decision: take the drink out, or pay the fee and keep it. It
 * only ever describes, and it never changes a price.
 *
 * Only offers whose other conditions are already met are considered, because
 * an offer that is off today is not a thing anybody can fix by moving food
 * around.
 */
export function nearMiss(
  offers: LiveOffer[],
  lines: CartItem[],
  context: { batchId: string; deliverAt?: string | null; returning: boolean }
): NearMiss | null {
  if (lines.length === 0) return null;
  const found: NearMiss[] = [];

  for (const offer of offers) {
    if (offer.firstOrderOnly && context.returning) continue;
    if (offer.runs.length > 0 && !offer.runs.includes(context.batchId)) continue;
    if (context.deliverAt && !offer.sameDay) continue;

    const qualifies = (line: CartItem) =>
      (offer.places.length === 0 || offer.places.includes(line.restaurantId)) &&
      (offer.items.length === 0 || offer.items.includes(line.itemId)) &&
      everyLineChose(offer.choice, [line.choices]);

    const good = lines.filter(qualifies);
    const bad = lines.filter((line) => !qualifies(line));

    // Nothing qualifying is not a near miss, it is a different order. And
    // nothing in the way means the offer already applies.
    if (good.length === 0 || bad.length === 0) continue;

    found.push({
      offer,
      fee: offerFee(offer, good.length),
      blocking: [...new Set(bad.map((line) => line.name))],
      qualifying: [...new Set(good.map((line) => line.name))],
    });
  }

  if (found.length === 0) return null;

  // The one worth mentioning is the one worth most, and the fewest things in
  // the way settles a tie: a cart is nearer to that one.
  return found.sort(
    (one, two) => one.fee - two.fee || one.blocking.length - two.blocking.length
  )[0];
}

/**
 * The choices an offer asks for, as they are spelt, for saying out loud.
 *
 * choiceSets lowercases so it can compare; this keeps the menu's own capitals
 * because a sentence reading "bbq chicken" looks like a mistake.
 */
export function choiceLabels(choice: string): string[][] {
  return readChoice(choice)
    .map((set) => set.map(optionName).filter(Boolean))
    .filter((set) => set.length > 0);
}

/**
 * The option's own name, out of the "Question::Option" a picker sends.
 *
 * The question travels with the answer because it is what says whether two
 * ticks are alternatives or conditions, and because BBQ Chicken means one
 * thing under First half and another under Second half. Everything that
 * compares or prints a choice wants only the answer.
 */
export function optionName(value: string): string {
  const raw = value.trim();
  const mark = raw.indexOf("::");
  return mark === -1 ? raw : raw.slice(mark + 2).trim();
}

/** Every "Question::Option" an offer holds, flat, for putting a picker back
 *  the way it was left. */
export function choiceValues(choice: string): string[] {
  return choice.trim().startsWith("[") ? readChoice(choice).flat() : [];
}

/**
 * The combinations an offer covers, spelt out, when there are few enough.
 *
 * A medium, and one of two flavours, is two real things somebody can picture:
 * a medium BBQ Chicken or a medium BBQ Meatball. Said as separate conditions
 * it is accurate and nobody reads it. Past a handful the list would be longer
 * than the menu, so it gives up and lets the conditions be listed instead.
 */
export function choiceCombinations(choice: string, most = 4): string[] {
  const sets = choiceLabels(choice);
  if (sets.length === 0) return [];

  const total = sets.reduce((count, set) => count * set.length, 1);
  if (total > most) return [];

  return sets.reduce<string[]>(
    (phrases, set) =>
      phrases.flatMap((phrase) =>
        set.map((one) => (phrase === "" ? one : `${phrase} ${one}`))
      ),
    [""]
  );
}
