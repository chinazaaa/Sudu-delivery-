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
