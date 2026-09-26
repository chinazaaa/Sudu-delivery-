"use client";

import { useRef } from "react";
import {
  PARCEL_ACTION,
  STAGES,
  STAGE_ACTION,
  stageIndex,
  type BatchStage,
} from "@/lib/stages";

/**
 * Where the run has got to, and the one press that moves it on.
 *
 * It was a dropdown, which is six equal choices when five of them are wrong:
 * a run at the counter goes on the road next, not back to ordering and not
 * to delivered. So the next step is a button, said as the thing you are
 * about to do, and the rest stay reachable for putting a mistake right.
 *
 * Read one-handed, in a queue, so the current step is written out rather
 * than left to a colour.
 */
export default function StagePicker({
  batchId,
  stage,
  action,
  parcel = false,
}: {
  batchId: string;
  stage: BatchStage;
  action: (form: FormData) => Promise<void>;
  /** A parcel is not cooked and is handed to one person, so the same six
   *  steps are said differently. */
  parcel?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const said = parcel ? PARCEL_ACTION : STAGE_ACTION;
  const at = stageIndex(stage);
  const next = STAGES[at + 1];

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <span className="rounded-full bg-black/5 px-3 py-1.5 text-sm font-bold">
        {/* Where it is, spelled out. A pip nobody can name is a pip nobody
            trusts at nine at night. */}
        Now: {said[stage]}
      </span>

      {next && (
        <form action={action}>
          <input type="hidden" name="batch_id" value={batchId} />
          <input type="hidden" name="stage" value={next} />
          <button className="btn-primary px-4 py-2 text-sm">
            Move to {said[next].toLowerCase()} →
          </button>
        </form>
      )}

      {/* Everything else, for putting right what was pressed by mistake. */}
      <form ref={form} action={action}>
        <input type="hidden" name="batch_id" value={batchId} />
        <label className="sr-only" htmlFor="stage">
          {parcel ? "Where the parcel is" : "Where the run is"}
        </label>
        <select
          id="stage"
          name="stage"
          // Keyed by the saved stage: when the page comes back with a new one
          // the control is rebuilt rather than keeping what was picked, so a
          // change that did not save is visible instead of silently assumed.
          key={stage}
          defaultValue={stage}
          onChange={() => form.current?.requestSubmit()}
          className="field w-auto py-2 text-sm font-semibold"
        >
          {STAGES.map((step) => (
            <option key={step} value={step}>
              {step === stage ? `${said[step]} · now` : said[step]}
            </option>
          ))}
        </select>
      </form>
    </div>
  );
}
