"use client";

import { useActionState, useState } from "react";
import { moveOrderToRun, type MoveState } from "@/app/actions";
import { naira } from "@/lib/money";

/**
 * Moving an order onto another run: the button, then the run, and it is done.
 * The food is already chosen, so sending someone back through the cart and
 * checkout to change one thing would be the long way round.
 */
export default function MoveOrder({
  orderId,
  total,
  runs,
  paid = false,
  collapsed = false,
  openLabel = "Change to another run",
}: {
  orderId: string;
  total: number;
  runs: { id: string; label: string; closes: string }[];
  /** A paid order moves as it is: no repricing, no refund, no top-up. */
  paid?: boolean;
  /** Start as a single line, for a page where moving is not the main thing. */
  collapsed?: boolean;
  openLabel?: string;
}) {
  const [open, setOpen] = useState(!collapsed);
  const [state, action, pending] = useActionState<MoveState, FormData>(
    moveOrderToRun,
    { error: null, movedTo: null }
  );

  if (state.movedTo) {
    return (
      <p className="rounded-xl bg-mint/10 px-3 py-2.5 text-sm font-semibold text-mint">
        Moved to {state.movedTo}.{" "}
        {paid
          ? "Nothing more to do: your food comes on that run."
          : "Pay for it below and you are on that run."}
      </p>
    );
  }

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted">
        No other run is open yet. Check back, or message us.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-quiet w-full py-2.5 text-sm"
      >
        {openLabel}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="run_label" value="" />

      <p className="text-sm font-semibold">Move it to:</p>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="submit"
              name="batch_id"
              value={run.id}
              disabled={pending}
              // The label rides along so the confirmation can name the run
              // rather than saying something moved somewhere.
              onClick={(event) => {
                const form = event.currentTarget.form;
                const field = form?.elements.namedItem(
                  "run_label"
                ) as HTMLInputElement | null;
                if (field) field.value = run.label;
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-left hover:border-ink/30 disabled:opacity-50"
            >
              <span>
                <span className="block font-semibold">{run.label}</span>
                <span className="block text-sm text-muted">{run.closes}</span>
              </span>
              <span className="shrink-0 font-bold text-brand">
                {pending ? "…" : "Move"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <p className="text-xs text-muted">
        {paid
          ? `Same food, same order number, same ${naira(total)}. Nothing is charged again.`
          : `Same food, same order number. It is repriced against today's menu and that run's delivery, so the total can change from ${naira(total)}.`}
      </p>
    </form>
  );
}
