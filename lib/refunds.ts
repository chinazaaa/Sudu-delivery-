import { isPaid } from "./orders";

/**
 * Money owed back when a paid order shrinks.
 *
 * The shop could already take a line out of an order: somebody orders a
 * chicken pie, the counter has sold the last one, and the pie comes off.
 * What it could not do was remember that the money for the pie had already
 * been collected. The total quietly dropped from 14,400 to 13,000 and the
 * 1,400 the customer was owed existed nowhere at all: not on her page, not
 * on the run's sheet, not in anybody's head by the next morning.
 *
 * That is the whole of what this is. An order that has not been paid for
 * can shrink freely, because nothing has moved. An order that has been paid
 * for cannot: every naira it shrinks by is a naira of somebody else's money
 * sitting in the shop's account, and that has to be written down the moment
 * it happens rather than remembered.
 *
 * Only downward. An order that grows is money the shop is owed, which is a
 * different conversation and one somebody has to actually have with the
 * customer before anything is charged.
 */

/**
 * What a shrink adds to what is owed back.
 *
 * Zero for an unpaid order, zero for one that grew or stayed still, and the
 * difference otherwise. Never negative, so a later top-up cannot quietly
 * eat a refund that is already owed.
 */
export function owedByShrinking(
  status: string,
  totalBefore: number,
  totalAfter: number
): number {
  if (!isPaid(status)) return 0;
  const before = Math.round(Number(totalBefore) || 0);
  const after = Math.round(Number(totalAfter) || 0);
  return Math.max(0, before - after);
}

/**
 * How a refund is explained on the customer's own page.
 *
 * The reason the shop typed, where somebody typed one. Where nobody did,
 * something true and plain rather than silence: she can see the order and
 * can see what it costs, so the one thing worth saying is that the money is
 * coming back and roughly why.
 *
 * The group wording is kept for the group case because it is more specific
 * than anything this could say: a fee dropping a band because two friends
 * pulled out is not "something was not available".
 */
export function refundSaid(said: string, fromGroup: boolean): string {
  const typed = String(said ?? "").trim();
  if (typed !== "") return typed;
  if (fromGroup) {
    return "Your group got smaller, so the delivery fee dropped a band. The difference comes back to you.";
  }
  return "Something in this order could not be bought, so it came off and the money for it comes back to you.";
}

/** Whether there is anything to pay back. */
export const owesSomething = (owed: number | null | undefined): boolean =>
  Math.round(Number(owed) || 0) > 0;
