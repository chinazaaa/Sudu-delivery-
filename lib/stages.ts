export const STAGES = [
  "ordering",
  "closed",
  "at_counter",
  "on_the_road",
  "at_drop",
  "handed_out",
] as const;

export type BatchStage = (typeof STAGES)[number];

/** What the customer reads on their order page. */
export const STAGE_LABEL: Record<BatchStage, string> = {
  ordering: "Ordering is open",
  closed: "Orders closed, getting ready to go",
  at_counter: "At the counter, food being cooked",
  on_the_road: "On the road to you",
  at_drop: "At your hostel now",
  handed_out: "Delivered",
};

/** What the admin taps. Shorter, because it is read one-handed in a queue. */
export const STAGE_ACTION: Record<BatchStage, string> = {
  ordering: "Ordering",
  closed: "Closed",
  at_counter: "At counter",
  on_the_road: "On the road",
  at_drop: "At the hostels",
  handed_out: "Delivered, every bag",
};

export function stageIndex(stage: BatchStage): number {
  return STAGES.indexOf(stage);
}

/**
 * The same six steps, said the way a parcel goes.
 *
 * A parcel is not cooked and does not arrive at a hostel by the boot-load:
 * "At the counter, food being cooked" on somebody's dress is the shop
 * describing a trip that is not happening. The stages themselves are the
 * same, because the run sheet, the timeline and the messages all read them.
 */
export const PARCEL_LABEL: Record<BatchStage, string> = {
  ordering: "Waiting to be paid for",
  closed: "Paid, waiting on the day",
  at_counter: "Collected",
  on_the_road: "On the road",
  at_drop: "Nearly there",
  handed_out: "Handed over",
};

export const PARCEL_ACTION: Record<BatchStage, string> = {
  ordering: "Not paid yet",
  closed: "Paid, not collected",
  at_counter: "Collected it",
  on_the_road: "On the road",
  at_drop: "Nearly there",
  handed_out: "Handed it over",
};

/**
 * What a finished run is called in admin, which is not what a customer is
 * told.
 *
 * To somebody waiting for food, "Delivered" is the end of the story and the
 * word they should read, settled or not: the books are the shop's business
 * and nothing to do with whether their bag arrived. STAGE_LABEL stays
 * exactly as it is and the customer's page is untouched.
 *
 * Inside the shop there is one more step. A run that has been handed out
 * still owes an answer about what it cost and what it made, and "Delivered"
 * on both sides of closing the books is a list where the finished ones and
 * the ones still waiting on you look identical. Once the books are closed it
 * is completed, and nothing else about it is anybody's job.
 */
export function adminStageLabel(
  stage: BatchStage,
  settledAt: string | null | undefined
): string {
  return stage === "handed_out" && settledAt ? "Completed" : STAGE_LABEL[stage];
}

/**
 * The same distinction for a run's status, which is the word the runs list
 * prints on each card. Lower case, because that list prints the status as
 * the database spells it and a single capitalised word in a row of
 * lower-case tags reads as a different kind of thing.
 */
export function adminStatusWord(
  status: string,
  settledAt: string | null | undefined
): string {
  return status === "delivered" && settledAt ? "completed" : status;
}

/**
 * Where a run goes back to when a tick at the counter is undone.
 *
 * The first thing ticked off moves a run to the counter, which is right:
 * ticking something is standing at a till with it in your hand. But the
 * tick itself lives in the browser of whoever is holding the phone, so
 * taking it back tells the shop nothing, and the run stayed at the
 * counter.
 *
 * That is not a cosmetic wrong stage. A run at the counter is a closed
 * run, and a closed run prices the next order on the last minute ladder:
 * somebody ordering two sandwiches a minute later was quoted 6,500 for
 * delivery instead of 4,000, because of a tap that had already been
 * taken back.
 *
 * So the clock decides, which is what decided it before anybody ticked
 * anything: a run whose cut-off is still ahead is taking orders, and one
 * whose cut-off has gone is closed and getting ready to go.
 */
export function backFromCounter(cutOffAt: string, now: Date = new Date()): BatchStage {
  const shuts = new Date(cutOffAt).getTime();
  // A cut-off nobody can read is treated as gone, which leaves the run
  // closed rather than quietly reopening one that should not be.
  if (!Number.isFinite(shuts)) return "closed";
  return shuts > now.getTime() ? "ordering" : "closed";
}

/**
 * Whether this trip's shopping is still ahead of it.
 *
 * The run sheet puts every run and car going out on one date into one
 * shopping list, which is right: a scheduled run and a car of its own on
 * one night are two promises and one drive, and kept apart the sheet sent
 * her to Burger King twice for what is one visit.
 *
 * It had nothing to say about a trip that has already gone. The afternoon
 * run was on the road with its food bought and handed over, and the night
 * run's sheet still listed its meal box under what to buy at KFC: an item
 * that was eaten two hours ago, on the list she is shopping from, with a
 * tick box beside it.
 *
 * On the road is the line. Up to there the food is still to be fetched
 * and sharing a counter saves a journey; past it the boot is shut and the
 * trip has nothing left to buy.
 */
export function stillShopping(stage: BatchStage | string | null | undefined): boolean {
  const at = STAGES.indexOf(String(stage ?? "ordering") as BatchStage);
  // A stage nobody can read is treated as still to go, which at worst
  // shows one line too many rather than hiding one that must be bought.
  if (at === -1) return true;
  return at < stageIndex("on_the_road");
}
