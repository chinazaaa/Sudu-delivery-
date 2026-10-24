"use client";

import ActionButton from "@/components/ActionButton";
import { setBatchStage } from "@/app/admin/actions";
import { carIsFull } from "@/app/run/[token]/actions";
import { STAGES, STAGE_ACTION, stageIndex, type BatchStage } from "@/lib/stages";

/**
 * Where the run is, moved by the person moving it.
 *
 * This is not a new thing to learn. It is the same tap already made on the
 * admin sheet, on a page that does not need the admin password, and it
 * posts to the same action: a stage carries the run's status, the two
 * notifications customers are actually waiting on, and the delivery of
 * every paid order when it reaches the end. A second copy of that would
 * drift from the first one inside a month.
 *
 * Forward only, and one step at a time. Putting a run back is a correction
 * made by the shop, from the shop: reopening ordering moves a cut-off and
 * changes what the whole website offers, which is not a thing to do by
 * accident on a phone in a car park.
 */
export default function RunStage({
  token,
  batchId,
  stage,
  shut = false,
}: {
  token: string;
  batchId: string;
  stage: BatchStage;
  /** Somebody has already said the car is full. */
  shut?: boolean;
}) {
  const at = stageIndex(stage);
  const next = at >= 0 && at < STAGES.length - 1 ? STAGES[at + 1] : null;

  return (
    <div className="card space-y-2.5 border-2 border-ink">
      <p className="ticket text-[11px] text-muted">Where the run is</p>
      <p className="font-display text-xl font-black uppercase leading-tight">
        {STAGE_ACTION[stage]}
      </p>

      {next ? (
        <form action={setBatchStage}>
          <input type="hidden" name="runner_token" value={token} />
          <input type="hidden" name="batch_id" value={batchId} />
          <input type="hidden" name="stage" value={next} />
          <ActionButton
            className="btn-primary w-full py-3 text-base"
            busy="Moving…"
            done="Moved ✓"
          >
            {STAGE_ACTION[next]} →
          </ActionButton>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Every bag on this run is marked delivered. Nothing left to move.
        </p>
      )}

      {/*
        Said plainly, because it is the one tap here that reaches a
        customer's phone. Somebody should know that before pressing it,
        not after.
      */}
      {(next === "on_the_road" || next === "at_drop") && (
        <p className="text-xs text-muted">
          This one buzzes everybody on the run.
        </p>
      )}
      {next === "handed_out" && (
        <p className="text-xs text-muted">
          This marks every paid bag on the run delivered and tells them so.
        </p>
      )}

      {/*
        The car is full, said by the person standing next to it.

        The shop has this button too, and the shop is not here. Everything
        else deciding whether another order can still be taken is the site
        reasoning from a stage and a list of counters, and none of it can
        see how much room is left in the boot. She can.
      */}
      <form action={carIsFull} className="border-t-[1.5px] border-rule pt-2.5">
        <input type="hidden" name="token" value={token} />
        {shut && <input type="hidden" name="open_again" value="1" />}
        <ActionButton
          className={`w-full py-3 text-base ${shut ? "btn-primary" : "btn-quiet"}`}
          busy="…"
          done={shut ? "Open ✓" : "Shut ✓"}
        >
          {shut ? "Take orders again" : "No more orders · the car is full"}
        </ActionButton>
      </form>
      {shut && (
        <p className="text-xs text-muted">
          Nothing more can be added to this run until somebody says
          otherwise.
        </p>
      )}
    </div>
  );
}
