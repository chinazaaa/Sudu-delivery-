import { stageIndex, type BatchStage } from "./stages";

/**
 * Which run the shop means by "today's run".
 *
 * There is usually one, and then the question never comes up. Two on one
 * day is ordinary though: a second window, or one made and left empty
 * while everything went on the other. Picking the first of them by date
 * picks whichever the database happened to return, and the button on the
 * dashboard kept opening the empty one, which is the one day's run that
 * cannot be worked on.
 *
 * So the order is: the one with orders on it, then the one furthest
 * along, then the one closing soonest. Food beats everything because a
 * run with nothing in it is not work whatever stage it claims, and a
 * stage only decides between two that both have food.
 */
export type RunToPick = {
  run_date: string;
  stage: BatchStage;
  /** Everything on it that has not been cancelled, paid or not. An order
   *  nobody has paid for yet is still a reason this is the run somebody
   *  is about to work on. */
  orderCount: number;
  cut_off_at: string;
};

function busiestFirst(a: RunToPick, b: RunToPick): number {
  const onA = a.orderCount;
  const onB = b.orderCount;
  // Something beats nothing. Not how much: two orders and five orders are
  // both a run somebody drives, and the dearer of them is not the point.
  if ((onA > 0) !== (onB > 0)) return onA > 0 ? -1 : 1;

  // Further along is the one being worked on right now.
  const far = stageIndex(b.stage) - stageIndex(a.stage);
  if (far !== 0) return far;

  return a.cut_off_at.localeCompare(b.cut_off_at);
}

/**
 * Today's run, or the next one still to come where today has none.
 *
 * Closed is not the wrong state for this: a run stops being open at its
 * cut-off, and the cut-off is the start of the work rather than the end.
 */
export function runToWorkOn<T extends RunToPick>(runs: T[], today: string): T | null {
  const now = runs.filter((one) => one.run_date === today);
  if (now.length > 0) return [...now].sort(busiestFirst)[0];

  const ahead = runs.filter((one) => one.run_date > today);
  if (ahead.length === 0) return null;

  // The soonest day, and then the same question within it.
  const soonest = ahead.reduce(
    (best, one) => (one.run_date < best ? one.run_date : best),
    ahead[0].run_date
  );
  return [...ahead.filter((one) => one.run_date === soonest)].sort(busiestFirst)[0];
}
