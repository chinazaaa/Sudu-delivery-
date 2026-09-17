"use client";

import { useActionState } from "react";
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
}: {
  orderId: string;
  total: number;
  runs: { id: string; label: string; closes: string }[];
}) {
  const [state, action, pending] = useActionState<MoveState, FormData>(
    moveOrderToRun,
    { error: null }
  );

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted">
        No other run is open yet. Check back, or message us.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="order_id" value={orderId} />

      <p className="text-sm font-semibold">Move it to:</p>
      <ul className="space-y-2">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="submit"
              name="batch_id"
              value={run.id}
              disabled={pending}
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
        Same food, same order number. It is repriced against today&apos;s menu
        and that run&apos;s delivery, so the total can change from{" "}
        {naira(total)}.
      </p>
    </form>
  );
}
