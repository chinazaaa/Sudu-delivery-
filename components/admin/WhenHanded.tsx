"use client";

import { useState } from "react";

/**
 * The time a bag changed hands, beside the button that says it did.
 *
 * Nobody ticks twenty bags off as each one is handed over. The run goes
 * out at five and gets tidied up at seven, and until now that told every
 * customer on it that their food arrived at seven, on the page they are
 * reading.
 *
 * So the button carries a clock. Left alone it means now, which is the
 * one-tap case and still one tap. Opened, it is a 24-hour box: a shop
 * reading "5:30" off a phone at seven in the evening cannot tell you
 * whether that was morning without the am on the end, and a box that has
 * to be read twice is a box that gets typed wrong.
 *
 * The date comes from the run, so a late-night run tidied up after
 * midnight lands on the right day rather than tomorrow.
 */
export default function WhenHanded({
  runDate = "",
  said = "Handed over at",
}: {
  /** The day the run went out, as "2026-10-14". */
  runDate?: string;
  said?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <input type="hidden" name="run_date" value={runDate} />
      {open ? (
        <label className="flex flex-wrap items-center gap-2 pb-2 text-xs text-muted">
          <span className="font-semibold">{said}</span>
          <input
            name="at"
            type="time"
            step={60}
            className="field field-admin w-auto border-[1.5px] border-line bg-paper px-2.5 py-1 text-sm"
            aria-label={said}
          />
          <span>24-hour, so 17:05 is the evening.</span>
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pb-2 text-xs font-semibold text-muted underline"
        >
          It went out earlier? Set the time
        </button>
      )}
    </div>
  );
}
