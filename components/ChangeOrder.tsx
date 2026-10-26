"use client";

import { useActionState, useState } from "react";
import { changeMyOrder, type ChangeState } from "@/app/actions";
import { naira } from "@/lib/money";
import SaveButton from "@/components/SaveButton";

export type ChangeableLine = {
  id: string;
  name: string;
  restaurant: string;
  qty: number;
  unitPrice: number;
  /** The choices on it, said the way the order page says them. */
  choices: string;
};

/**
 * Changing an order rather than placing it again.
 *
 * Somebody orders one pack of rice and then wants two. Ordering again is
 * one tap, and finding out how to change the first was not, so people
 * ordered again and the shop cancelled the first by hand every time. This
 * is the same job made cheaper than the duplicate.
 *
 * Folded away, because most orders are never changed and a row of steppers
 * over the pay button is a page asking a question nobody had. Open it and
 * it is plus, minus, and save.
 *
 * Nothing here decides anything. The quantities are sent and the server
 * says yes or no: it is the only place that knows whether the money has
 * landed since this page was drawn.
 */
export default function ChangeOrder({
  orderId,
  lines,
}: {
  orderId: string;
  lines: ChangeableLine[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ChangeState, FormData>(changeMyOrder, {
    ok: false,
    error: null,
  });
  // Held here so the numbers move under a thumb rather than after a round
  // trip to Lagos. What is sent is still whatever the server will stand
  // behind.
  const [qty, setQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, line.qty]))
  );

  const set = (id: string, to: number) =>
    setQty((was) => ({ ...was, [id]: Math.max(0, Math.min(20, to)) }));

  const changed = lines.some((line) => (qty[line.id] ?? line.qty) !== line.qty);
  const left = lines.reduce((count, line) => count + (qty[line.id] ?? line.qty), 0);

  if (lines.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl bg-shell px-3 py-2.5 text-left text-sm font-semibold text-brand-dark"
      >
        Need more, or less?{" "}
        <span className="underline decoration-dotted underline-offset-4">
          Change this order
        </span>{" "}
        instead of ordering again.
      </button>
    );
  }

  return (
    <form action={action} className="soft space-y-3 bg-shell px-3.5 py-3">
      <input type="hidden" name="order_id" value={orderId} />

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-extrabold">Change this order</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-semibold text-muted underline"
        >
          Close
        </button>
      </div>

      <ul className="space-y-2">
        {lines.map((line) => {
          const count = qty[line.id] ?? line.qty;
          return (
            <li key={line.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block font-semibold [overflow-wrap:anywhere]">
                  {line.name}
                </span>
                <span className="block text-xs text-muted [overflow-wrap:anywhere]">
                  {line.restaurant}
                  {line.choices !== "" ? ` · ${line.choices}` : ""} ·{" "}
                  {naira(line.unitPrice)} each
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => set(line.id, count - 1)}
                  aria-label={`One fewer ${line.name}`}
                  className="size-11 rounded-full border-2 border-ink text-lg font-extrabold"
                >
                  &minus;
                </button>
                <span className="w-7 text-center font-mono font-bold">{count}</span>
                <button
                  type="button"
                  onClick={() => set(line.id, count + 1)}
                  aria-label={`One more ${line.name}`}
                  className="size-11 rounded-full border-2 border-ink text-lg font-extrabold"
                >
                  +
                </button>
              </span>
              <input type="hidden" name={`qty_${line.id}`} value={count} />
            </li>
          );
        })}
      </ul>

      {/* Said before they press it, because nought of everything is a
          cancellation and the server is about to tell them so anyway. */}
      {left === 0 && (
        <p className="text-sm font-semibold text-brand-dark">
          That takes everything off. Use cancel below if you no longer want it.
        </p>
      )}

      {state.error && (
        <p className="soft bg-brand-wash px-3 py-2 text-sm text-brand-dark">
          {state.error}
        </p>
      )}
      {state.ok && !changed && (
        <p className="text-sm font-semibold text-ink">
          Changed. The new total is above.
        </p>
      )}

      <p className="text-xs text-muted">
        Delivery is worked out again from what is left, so the total can move
        either way. Nothing is charged until you pay.
      </p>

      {/* Only once there is a change worth making. A live button over
          numbers nobody has touched invites a press that does nothing, and
          nought of everything belongs on the cancel button below, not this
          one. */}
      {changed && left > 0 ? (
        <SaveButton look="btn-primary w-full">Save the change</SaveButton>
      ) : (
        <p className="text-sm text-muted">
          {left === 0
            ? "Put at least one thing back to save."
            : "Change a number above and this will save it."}
        </p>
      )}
    </form>
  );
}
