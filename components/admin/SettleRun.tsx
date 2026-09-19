"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Closing the books on a run.
 *
 * Delivered is about the food and this is about the money, which is days
 * later: the counter sheet has to be priced, the fuel put in, the one person
 * who never paid chased. Until somebody says it is finished there is no
 * telling a run that is done from one that merely arrived, so the page goes
 * on looking like work.
 *
 * What can be checked is checked before the button will do anything. What
 * cannot — whether every price on the sheet is right — is what the
 * confirmation is for: somebody saying they have been through it.
 */
export default function SettleRun({
  open,
  unpriced,
  action,
  batchId,
}: {
  /** What is still outstanding, in the words somebody would use. */
  open: string[];
  /** Counter lines nobody priced. Worth saying, not worth refusing over. */
  unpriced: number;
  action: (form: FormData) => Promise<void>;
  batchId: string;
}) {
  const [asking, setAsking] = useState(false);
  const [showing, setShowing] = useState(false);

  if (open.length > 0) {
    return (
      <div className="card border-amber-200 bg-amber-50">
        <h2 className="font-bold text-amber-900">This run is not finished</h2>
        <ul className="mt-2 space-y-1 text-sm text-amber-900/90">
          {open.map((one) => (
            <li key={one}>· {one}</li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="btn-quiet mt-3 px-4 py-2.5 text-sm opacity-50"
        >
          Close the books
        </button>
        <p className="mt-2 text-xs text-amber-900/75">
          Sort those and this becomes a button. A run closed with money still
          out is a run nobody thinks to look at again.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-bold">Everything on this run is settled</h2>
      <p className="mt-0.5 text-sm text-muted">
        Delivered, paid for, and the costs are in.
        {unpriced > 0 &&
          ` ${unpriced} counter line${
            unpriced === 1 ? "" : "s"
          } stayed at the menu price, which is fine if that is what you paid.`}
      </p>

      {!asking ? (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="btn-primary mt-3 px-4 py-2.5 text-sm"
        >
          Close the books
        </button>
      ) : (
        <form action={action} className="mt-3 space-y-2">
          <input type="hidden" name="batch_id" value={batchId} />
          <p className="text-sm font-semibold">
            Have you been through the counter sheet and the costs? This turns
            the run into a record of what it came to. You can open it again.
          </p>
          <div className="flex flex-wrap gap-2">
            <Confirm />
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="chip border-black/10 bg-white"
            >
              Not yet
            </button>
          </div>
        </form>
      )}

      {/* The rest of the page is still there for anybody who wants it, just
          not in the way of the one thing left to do. */}
      <button
        type="button"
        onClick={() => setShowing((was) => !was)}
        className="mt-3 text-xs font-bold text-brand"
      >
        {showing ? "Hide the working" : "Show the working"}
      </button>
      {showing && (
        <p className="mt-1 text-xs text-muted">
          Scroll on for the counter sheet, the handout list and the costs.
        </p>
      )}
    </div>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary px-4 py-2.5 text-sm" disabled={pending}>
      {pending ? "Closing…" : "Yes, the books are closed"}
    </button>
  );
}
