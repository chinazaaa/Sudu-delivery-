"use client";

import { useActionState, useState } from "react";
import { submitReorder } from "@/app/actions";
import { naira } from "@/lib/money";
import type { BatchView } from "@/lib/view";

export type PreviousOrder = {
  phone: string;
  name: string;
  hostel: string;
  lines: { id: string; qty: number; name: string; restaurant: string }[];
  foodTotal: number;
  total: number;
};

/**
 * One-tap reorder. Most students eat the same thing every time, so the whole
 * repeat order is a phone number and a button (brief §3a).
 */
export default function ReorderCard({
  previous,
  batches,
}: {
  previous: PreviousOrder;
  batches: BatchView[];
}) {
  const openable = batches.filter((b) => !b.full);
  const [batchId, setBatchId] = useState(openable[0]?.id ?? "");
  const [state, action, pending] = useActionState(submitReorder, { error: null });

  return (
    <form action={action} className="card space-y-3">
      <input type="hidden" name="phone" value={previous.phone} />
      <input type="hidden" name="batch_id" value={batchId} />

      <div>
        <h2 className="font-semibold">Same again, {previous.name}?</h2>
        <p className="text-sm text-muted">{previous.hostel}</p>
      </div>

      <ul className="space-y-1 text-sm">
        {previous.lines.map((line) => (
          <li key={line.id}>
            {line.qty}× {line.name}{" "}
            <span className="text-muted">({line.restaurant})</span>
          </li>
        ))}
      </ul>

      <p className="border-t border-black/10 pt-2 text-sm">
        Food {naira(previous.foodTotal)} · total{" "}
        <span className="font-semibold">{naira(previous.total)}</span> at today&apos;s
        prices.
      </p>

      {openable.length === 0 ? (
        <p className="text-sm text-ink/75">No batch is open right now.</p>
      ) : (
        <div>
          <label className="label" htmlFor="batch">Into which batch?</label>
          <select
            id="batch"
            className="field"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          >
            {openable.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.label} · closes {batch.cutOffLabel}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={pending || !batchId}
      >
        {pending ? "Placing…" : "Order this again"}
      </button>
    </form>
  );
}
