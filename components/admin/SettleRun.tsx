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
  untouched,
  action,
  batchId,
  primary = false,
}: {
  /** What is still outstanding, in the words somebody would use. */
  open: string[];
  /** Counter lines nobody priced. Worth saying, not worth refusing over. */
  unpriced: number;
  /** Nothing at all was typed at the counter, which is either a run that
   *  cost exactly the menu price or a run nobody checked. Only one person
   *  knows which. */
  untouched: boolean;
  action: (form: FormData) => Promise<void>;
  batchId: string;
  /**
   * Whether closing the books is the one thing left to do on the page.
   *
   * There is one Tomato button per screen, and on a run still moving that
   * button is "move it on" at the top. Once the last bag is handed over
   * there is no stage left to move to, so this becomes the thing to do next
   * and takes the colour.
   */
  primary?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [showing, setShowing] = useState(false);
  const [checked, setChecked] = useState(false);

  if (open.length > 0) {
    return (
      <div className="card border-volt-line bg-brand-tint">
        <h2 className="font-display text-[19px] font-black uppercase leading-none sm:text-[24px]">
          This run is not finished
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {open.map((one) => (
            <li key={one}>· {one}</li>
          ))}
        </ul>
        <button
          type="button"
          disabled
          className="btn-admin mt-3 opacity-40"
        >
          Close the books
        </button>
        <p className="hint mt-2">
          Sort those and this becomes a button. A run closed with money still
          out is a run nobody thinks to look at again.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-display text-[19px] font-black uppercase leading-none sm:text-[24px]">
        Everything on this run is settled
      </h2>
      <p className="hint mt-1">
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
          className={`btn-admin mt-3 ${primary ? "btn-admin-go" : ""}`}
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

          {/* Nothing typed at the counter means one of two things, and only
              one person knows which. Asked rather than assumed, because the
              assumption is worth money and the tick costs a second. */}
          {untouched && (
            <label className="soft flex items-start gap-2 bg-shell px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="counter_checked"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Nothing was typed at the counter on this run. Tick to say every
                price really was the menu price.
              </span>
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <Confirm ready={!untouched || checked} primary={primary} />
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="btn-admin btn-admin-sm"
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
        /* A control, so it is drawn as one: the row action is forty-four
           pixels on a phone and thirty-four from `sm`, and a line of small
           bold text is neither. */
        className="btn-admin btn-admin-sm mt-3"
      >
        {showing ? "Hide the working" : "Show the working"}
      </button>
      {showing && (
        <p className="hint mt-1">
          Scroll on for the counter sheet, the handout list and the costs.
        </p>
      )}
    </div>
  );
}

function Confirm({ ready, primary }: { ready: boolean; primary: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`btn-admin disabled:opacity-40 ${primary ? "btn-admin-go" : ""}`}
      disabled={pending || !ready}
    >
      {pending ? "Closing…" : "Yes, the books are closed"}
    </button>
  );
}
