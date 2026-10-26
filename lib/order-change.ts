/**
 * Changing an order instead of placing it again.
 *
 * Somebody orders one pack of rice and then wants two. Ordering again is one
 * tap; finding out how to change the first is not, so people order again and
 * the shop is left cancelling the first by hand. The cheapest path wins, so
 * the cheapest path has to be the right one.
 *
 * Only while nothing has been paid and the run is still taking orders. Once
 * money has changed hands the shop owes a refund rather than a smaller
 * number, and once the car has gone shopping the food is already bought.
 * Both of those are somebody's job rather than a button.
 *
 * The rules live here, away from the database, because they are the part
 * worth being sure about: what the quantities become, and when the whole
 * thing has to be refused.
 */

/** What the customer asked for, line by line. Nought removes the line. */
export type WantedQty = { lineId: string; qty: number };

export type LineNow = { id: string; qty: number };

/** The most of any one thing somebody can talk themselves into. Keeps a
 *  stuck thumb on a stepper from ordering ninety packs of rice. */
export const MOST_OF_ONE = 20;

/**
 * Why this order is not the customer's to change.
 *
 * Empty means it is. Said in their words, because every one of these ends
 * up on the page in front of them.
 */
export function whyNotChangeable(order: {
  status: string;
  /** How many people are in the shared delivery, this one included. */
  shares: number;
  /** Whether the run is still taking orders. */
  stillOpen: boolean;
}): string {
  if (order.status !== "pending") {
    return "This order is paid for, so message us and we will change it.";
  }
  // One car, several people, one fee split between them: changing one part
  // moves everybody's share, and that is a conversation rather than a
  // stepper.
  if (order.shares > 1) {
    return "This is part of a shared delivery, so message us and we will change it.";
  }
  if (!order.stillOpen) {
    return "This run has closed, so message us and we will see what we can do.";
  }
  return "";
}

/**
 * What the lines become.
 *
 * Anything not mentioned is left exactly as it is, so a form that sends only
 * what changed behaves the same as one that sends everything. A quantity of
 * nought takes the line off.
 */
export function applyWanted(
  lines: LineNow[],
  wanted: WantedQty[]
): { keep: LineNow[]; drop: string[] } {
  const asked = new Map(wanted.map((one) => [one.lineId, one.qty]));
  const keep: LineNow[] = [];
  const drop: string[] = [];

  for (const line of lines) {
    if (!asked.has(line.id)) {
      keep.push(line);
      continue;
    }
    const qty = Math.floor(Number(asked.get(line.id)));
    if (!Number.isFinite(qty) || qty <= 0) {
      drop.push(line.id);
      continue;
    }
    keep.push({ id: line.id, qty: Math.min(qty, MOST_OF_ONE) });
  }

  return { keep, drop };
}

/**
 * Whether anything actually changed.
 *
 * A save that changes nothing still costs a repricing and a page load, and
 * on a slow phone it reads as the shop doing something to the order. Worth
 * knowing before any of that starts.
 */
export function somethingChanged(lines: LineNow[], wanted: WantedQty[]): boolean {
  const { keep, drop } = applyWanted(lines, wanted);
  if (drop.length > 0) return true;
  if (keep.length !== lines.length) return true;
  const was = new Map(lines.map((one) => [one.id, one.qty]));
  return keep.some((one) => was.get(one.id) !== one.qty);
}

/**
 * Taking everything out is not a change, it is a cancellation.
 *
 * Said rather than quietly left alone, because somebody who has emptied
 * every line has decided something and should be told where that decision
 * actually lives.
 */
export function emptiesIt(lines: LineNow[], wanted: WantedQty[]): boolean {
  return lines.length > 0 && applyWanted(lines, wanted).keep.length === 0;
}
