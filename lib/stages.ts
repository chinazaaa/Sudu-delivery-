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
