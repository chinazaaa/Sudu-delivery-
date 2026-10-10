import { db } from "./supabase";
import { isGone } from "./orders";
import { stageIndex, type BatchStage } from "./stages";

/**
 * The run follows its orders, the way the orders already follow their run.
 *
 * Tapping "Delivered, every bag" on a run marks every paid order on it
 * delivered. The other direction did not exist: handing over the only order
 * on a Tuesday car left the car reading "on the road" for ever, and the only
 * way to finish it was to open the run and tap the stage by hand. On a day
 * with one order that is two screens for a thing already done.
 *
 * So after an order moves, the run is asked what its orders now say:
 *
 *   every live order delivered  ->  the run is delivered
 *   some delivered, not all     ->  the run is at the hostels
 *   none delivered              ->  the run is left exactly as it is
 *
 * Only ever forwards. A run that is already at the hostels is not pulled
 * back by an order going out, and a delivered run is never un-delivered: a
 * stage is what the customers were told, and telling them twice in opposite
 * directions is worse than a stage that is an hour stale.
 *
 * An unpaid order counts as still outstanding, because it is: it is on the
 * run, somebody is expecting it, and the shop has not decided yet whether it
 * is coming. Cancelling it is that decision, and this runs again after a
 * cancellation, so the run finishes itself the moment the last question
 * about it is answered.
 *
 * The rule itself is this pure function, and the database work is the
 * wrapper under it: whether handing over the fourth of five bags finishes a
 * run is the kind of thing that has to be provable without a run.
 */
export function runShouldBe(
  stage: BatchStage,
  /** The status of every order on the run, the written-off included: this
   *  drops them itself, so a caller cannot forget to. */
  statuses: string[]
): BatchStage | null {
  const live = statuses.filter((one) => !isGone(one));
  // A run with nothing live on it is not a delivered run, it is an empty
  // one. Saying otherwise would close the books on a car that never went.
  if (live.length === 0) return null;

  const delivered = live.filter((one) => one === "delivered").length;
  if (delivered === 0) return null;

  const next: BatchStage = delivered === live.length ? "handed_out" : "at_drop";
  // Only ever forwards.
  return stageIndex(stage) >= stageIndex(next) ? null : next;
}

export async function followRun(batchId: string | null | undefined): Promise<void> {
  const id = String(batchId ?? "").trim();
  if (id === "") return;

  try {
    const { data: batch } = await db()
      .from("batches")
      .select("id, stage, status")
      .eq("id", id)
      .maybeSingle();
    const run = batch as { stage: BatchStage; status: string } | null;
    if (!run) return;
    // Already finished. Nothing an order does reopens a run.
    if (run.status === "delivered" || run.status === "cancelled") return;

    const { data } = await db()
      .from("orders")
      .select("status")
      .eq("batch_id", id);

    const next = runShouldBe(
      run.stage,
      ((data ?? []) as { status: string }[]).map((one) => one.status)
    );
    if (next === null) return;

    await db()
      .from("batches")
      .update({
        stage: next,
        status: next === "handed_out" ? "delivered" : "closed",
        stage_updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch {
    // The order was delivered, which is the part that matters. A run whose
    // stage did not keep up is a tap on the run page, not a failed action.
  }
}

/** The same, for however many runs a bulk action touched. */
export async function followRuns(batchIds: (string | null | undefined)[]): Promise<void> {
  for (const id of new Set(batchIds.map((one) => String(one ?? "")).filter(Boolean))) {
    await followRun(id);
  }
}
