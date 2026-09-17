"use client";

import { useRef } from "react";
import { STAGES, STAGE_ACTION, type BatchStage } from "@/lib/stages";

/**
 * Where the run has got to, at the top of the sheet. Moving a run on is the
 * thing done most often and from a phone, so it should not mean scrolling
 * past the counter sheet, the handout and the money to reach it.
 *
 * Changing the stage carries the run's status with it: leaving "Ordering"
 * closes it to new orders, "Delivered" marks it delivered.
 */
export default function StagePicker({
  batchId,
  stage,
  action,
}: {
  batchId: string;
  stage: BatchStage;
  action: (form: FormData) => Promise<void>;
}) {
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={action} className="flex items-center gap-2">
      <input type="hidden" name="batch_id" value={batchId} />
      <label className="sr-only" htmlFor="stage">
        Where the run is
      </label>
      <select
        id="stage"
        name="stage"
        defaultValue={stage}
        onChange={() => form.current?.requestSubmit()}
        className="field w-auto py-2.5 text-sm font-semibold"
      >
        {STAGES.map((step) => (
          <option key={step} value={step}>
            {STAGE_ACTION[step]}
          </option>
        ))}
      </select>
    </form>
  );
}
