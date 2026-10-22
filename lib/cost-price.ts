/**
 * What a thing costs, and what it sells for.
 *
 * The menu holds the selling price, because that is what a customer is
 * charged and what every order, total and figure in the shop already
 * reads. The cost sits beside it, and the selling price is worked out from
 * it, so the two stay in step the day a counter puts its prices up.
 *
 * Both directions live here. Going up is the one used when somebody types
 * a cost; going down is how four thousand existing items got a cost at all,
 * and it is arithmetic rather than knowledge, which is why the shop also
 * records whether anybody has checked.
 */

/** What the shop has always added. Editable in Settings. */
export const DEFAULT_MARKUP = 15;

/**
 * Rounded to the nearest fifty naira.
 *
 * Nobody prices food at 1,826. A menu full of figures worked out to the
 * naira reads as a spreadsheet rather than a price list, and the rounding
 * is where the shop's own judgement already lived before any of this was
 * written down.
 */
export const ROUND_TO = 50;

/** The markup as a number, however it arrives from the database. */
export function markupOf(value: unknown, fallback = DEFAULT_MARKUP): number {
  const said = Number(value);
  // Negative is somebody selling below cost by accident, which is a typo
  // every time. Zero is a real answer and is left alone.
  return Number.isFinite(said) && said >= 0 ? said : fallback;
}

/**
 * The selling price for a cost.
 *
 * Rounded up to the nearest fifty rather than to the nearest, because
 * rounding down is the shop paying the difference. On a hundred items that
 * is a real amount of money given away by a rounding rule nobody chose.
 */
export function sellingFrom(
  cost: number,
  markup: number = DEFAULT_MARKUP,
  roundTo: number = ROUND_TO
): number {
  const base = Math.max(0, Math.round(Number(cost) || 0));
  if (base === 0) return 0;

  const up = base * (1 + markupOf(markup) / 100);
  if (roundTo <= 1) return Math.ceil(up);
  return Math.ceil(up / roundTo) * roundTo;
}

/**
 * The cost a selling price implies.
 *
 * Only ever a guess, and the shop says so elsewhere: it assumes the markup
 * was applied, which is written down for two counters and assumed for the
 * rest. Rounding means it cannot recover the original exactly either, so
 * this is a starting point for somebody with a receipt, not an answer.
 */
export function costFrom(selling: number, markup: number = DEFAULT_MARKUP): number {
  const price = Math.max(0, Math.round(Number(selling) || 0));
  if (price === 0) return 0;
  return Math.round(price / (1 + markupOf(markup) / 100));
}

/**
 * What the shop keeps on one of these, and what share that is.
 *
 * Null where there is no cost to compare against, rather than zero: a
 * missing cost and a thing sold at cost are different facts, and a page
 * reading "0% kept" over an item nobody has priced is the kind of wrong
 * that gets believed.
 */
export function keptOn(
  selling: number,
  cost: number | null | undefined
): { kept: number; share: number } | null {
  const price = Math.round(Number(selling) || 0);
  if (cost === null || cost === undefined) return null;

  const paid = Math.round(Number(cost) || 0);
  if (price <= 0) return null;

  const kept = price - paid;
  return { kept, share: Math.round((kept / price) * 100) };
}

/**
 * What a whole counter line is expected to cost.
 *
 * The one figure the person at the till actually needs, and for a long
 * time the run sheet showed the other one. It said "the card should be"
 * over the menu total, which is the cost with the markup on: she would
 * have paid six thousand against a sheet asking for six thousand nine
 * hundred, on every line, every run, and spent the evening correcting a
 * difference that was never a difference.
 *
 * The division works on the whole line, choices and all, because the
 * markup was applied to the choices too: a large pepperoni's price is a
 * large pepperoni's cost with fifteen on. So there is nothing to
 * apportion between the pizza and the size, which is the thing that
 * looked hard about this and turned out not to exist.
 */
export function lineCost(
  unitPrice: number,
  qty: number,
  markup: number = DEFAULT_MARKUP
): number {
  const each = costFrom(unitPrice, markup);
  return each * Math.max(0, Math.round(Number(qty) || 0));
}

/**
 * Whether a receipt says a counter has put its price up.
 *
 * Only upward, which is the shop's rule one level down from the menu and
 * for the same reason written on it: a counter charging less is usually a
 * deal or a good mood on the day, and following it down would drop what
 * the shop expects to pay on the strength of one afternoon. Next week the
 * deal is over and the sheet is wrong in the direction that costs money.
 *
 * Null where there is nothing to learn, so a caller can tell "this is
 * news" from "this is the price we already had".
 */
export function raisedCost(
  expected: number | null | undefined,
  paidForOne: number
): number | null {
  const paid = Math.round(Number(paidForOne) || 0);
  if (paid <= 0) return null;

  // Nothing known is something learned, whatever the figure.
  if (expected === null || expected === undefined) return paid;

  const was = Math.round(Number(expected) || 0);
  return paid > was ? paid : null;
}

/**
 * What a run's food should cost at the counters.
 *
 * Every line backed off its selling price by the counter's own markup,
 * which is the shop's best standing guess at what a till will ask for and
 * is now a good one: every item on the menu carries a cost, and a few
 * hundred of them have been checked against a board.
 *
 * It replaces the menu price as the figure used where nobody has typed a
 * receipt. The menu price was never a guess at the cost at all: it is the
 * cost with the markup already on it, so using it said the shop paid
 * exactly what it charged and earned nothing on food. On the run that
 * prompted this, the counter sheet said 7,304 and the tile above it said
 * 8,400, which is the customer's price, on the same screen.
 */
export function expectedFoodCost(
  lines: { qty: number; unitPrice: number }[],
  markup: number = DEFAULT_MARKUP
): number {
  return lines.reduce(
    (total, line) => total + lineCost(line.unitPrice, line.qty, markup),
    0
  );
}
