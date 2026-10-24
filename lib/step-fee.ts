/**
 * Delivery priced by the box rather than by the thing.
 *
 * A restaurant's ladder counts containers, because a car carrying twelve
 * takeaway boxes is a different car from one carrying two. A market's goes
 * by what the shopping comes to, because eleven peppers is one trip and two
 * bags. Neither of those describes Fantasy ice cream.
 *
 * It is a small ice cream and the people who buy it buy a lot: fifteen is
 * one cool box, and thirty is two. On the container ladder fifteen prices
 * as fifteen takeaway boxes, which is a number nobody pays; on the value
 * ladder it prices as whatever fifteen small ice creams cost, which has
 * nothing to do with the room they take.
 *
 * What it actually costs is the box. So this is a first lot at one price
 * and every further lot at another, going up as far as somebody wants to
 * buy and never falling off a cliff: fifteen is four thousand, thirty is
 * four thousand five hundred, forty-five is five thousand.
 */
export type StepFee = {
  /** How many the first price covers. */
  first: number;
  /** What that first lot costs to bring. */
  firstFee: number;
  /** How many each further lot is. */
  step: number;
  /** What each further lot adds. */
  stepFee: number;
};

/** Nothing set up, which is a restaurant priced the ordinary way. */
export const NO_STEPS: StepFee | null = null;

const whole = (raw: unknown, least = 0) => {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && n >= least ? n : least;
};

export function parseStepFee(json: string | null | undefined): StepFee | null {
  if (!json || !json.trim()) return null;
  try {
    const raw = JSON.parse(json) as Partial<StepFee>;
    const first = whole(raw.first, 0);
    const step = whole(raw.step, 0);
    const firstFee = whole(raw.firstFee, 0);
    const stepFee = whole(raw.stepFee, 0);
    // A first lot of nothing, or a step of nothing, is not a ladder: it
    // would charge the same for one as for a thousand, or divide by zero
    // working out how many lots there are.
    if (first < 1 || step < 1) return null;
    return { first, firstFee, step, stepFee };
  } catch {
    // A row nobody can read is a restaurant priced the ordinary way, which
    // is what it was before anybody typed this.
    return null;
  }
}

export function serialiseStepFee(steps: StepFee | null): string {
  return steps === null ? "" : JSON.stringify(steps);
}

/**
 * What this many of them costs to bring.
 *
 * Part of a lot is a lot: sixteen needs the second cool box as surely as
 * thirty does, and charging sixteen as fifteen is giving the box away.
 */
export function feeByStep(count: number, steps: StepFee | null): number {
  if (steps === null) return 0;
  const many = Math.max(0, Math.floor(Number(count) || 0));
  if (many <= 0) return 0;
  if (many <= steps.first) return steps.firstFee;
  const over = many - steps.first;
  return steps.firstFee + Math.ceil(over / steps.step) * steps.stepFee;
}

/**
 * Said the way it reads on a page.
 *
 * "15 for ₦4,000, then ₦500 for every 15 after that", which is the whole
 * rule in one line and the only wording a customer needs.
 */
export function stepsSaid(
  steps: StepFee | null,
  naira: (amount: number) => string
): string {
  if (steps === null) return "";
  return steps.stepFee === 0
    ? `${steps.firstFee > 0 ? naira(steps.firstFee) : "Free"} however many you take`
    : `${steps.first} for ${naira(steps.firstFee)}, then ${naira(steps.stepFee)} ` +
        `for every ${steps.step} after that`;
}

/**
 * What a cart costs where part of it is picked up on the way.
 *
 * Fantasy ice cream is not a stop the car makes for its own sake: it is
 * grabbed on the way past, and the three Domino's pizzas are what the
 * trip is actually for. Charging it a trip of its own on top of theirs
 * charges twice for one journey, which is how a cart with both in it
 * falls off a cliff and the customer places two orders instead. They
 * would be right to.
 *
 * So where there is anything else in the cart, the rest of it pays its
 * own way and the ice cream adds one step on top: the five hundred naira
 * that is the ladder's own word for "and these as well". Not the whole
 * box, because the box is going anyway, and not nothing, because a boot
 * full of tubs is not free to carry. However many there are: eleven and
 * thirty are the same answer, which is the shop saying the ice cream is
 * never what the trip was for.
 *
 * Alone in the cart it is the trip, so it pays the whole ladder: fifteen
 * is four thousand and thirty is four and a half.
 */
export function feeRidingAlong(args: {
  /** How many of the by-the-box things are in the cart. */
  stepCount: number;
  /** The ladder they are charged by. Null is nothing priced this way, and
   *  then the ordinary fee stands untouched. */
  steps: StepFee | null;
  /** What the rest of the cart costs on the ordinary ladder, with these
   *  left out of the count. Nought is a cart that is nothing else. */
  otherFee: number;
}): number {
  if (args.steps === null || args.stepCount <= 0) return args.otherFee;
  if (args.otherFee <= 0) return feeByStep(args.stepCount, args.steps);
  return args.otherFee + args.steps.stepFee;
}
