"use client";

import { useState } from "react";
import { serialiseBands, type Band } from "@/lib/fees";
import { naira } from "@/lib/money";

/**
 * The delivery price list. The top band always catches everything above it,
 * so no order can ever fall through the bottom of the table and price as
 * nothing.
 */
export default function BandEditor({
  initial,
  field = "fee_bands",
}: {
  initial: Band[];
  /** Which settings row it writes to. The runs and the pick-a-time service
   *  have separate ladders, edited by the same control. */
  field?: string;
}) {
  const [bands, setBands] = useState(
    initial.map((band) => ({
      maxItems: Number.isFinite(band.maxItems) ? String(band.maxItems) : "",
      fee: String(band.fee),
      perItem: band.perItem ? String(band.perItem) : "",
    }))
  );

  const parsed: Band[] = bands.map((band, index) => ({
    maxItems:
      index === bands.length - 1 || band.maxItems.trim() === ""
        ? Infinity
        : Number(band.maxItems) || 1,
    fee: Number(band.fee) || 0,
    // Only the open band can charge by the item, because it is the only one
    // with no ceiling to price against.
    perItem:
      index === bands.length - 1 && Number(band.perItem) > 0
        ? Number(band.perItem)
        : undefined,
  }));

  const edit = (
    index: number,
    patch: Partial<{ maxItems: string; fee: string; perItem: string }>
  ) =>
    setBands((current) =>
      current.map((band, i) => (i === index ? { ...band, ...patch } : band))
    );

  return (
    <div className="space-y-3">
      <input type="hidden" name={field} value={serialiseBands(parsed)} />

      <ul className="space-y-2">
        {bands.map((band, index) => {
          const from =
            index === 0 ? 1 : (Number(bands[index - 1].maxItems) || 0) + 1;
          const last = index === bands.length - 1;

          return (
            <li key={index} className="flex flex-wrap items-end gap-2">
              <div className="w-28">
                <label className="label">From</label>
                <input
                  disabled
                  value={from}
                  className="field bg-black/[0.03] py-2 text-sm text-muted"
                />
              </div>
              <div className="w-28">
                <label className="label">Up to</label>
                <input
                  inputMode="numeric"
                  value={last ? "" : band.maxItems}
                  disabled={last}
                  placeholder={last ? "no limit" : ""}
                  onChange={(event) => edit(index, { maxItems: event.target.value })}
                  className="field py-2 text-sm disabled:bg-black/[0.03]"
                />
              </div>
              <div className="w-32 grow">
                <label className="label">Delivery costs</label>
                <input
                  inputMode="numeric"
                  value={band.fee}
                  onChange={(event) => edit(index, { fee: event.target.value })}
                  className="field py-2 text-sm"
                />
              </div>
              {/* The open band has no ceiling, so a flat price on it charges
                  the same to carry eleven containers as thirty. A price per
                  item makes the eleventh cost the tenth plus that. */}
              {last && bands.length > 1 && (
                <div className="w-36">
                  <label className="label">Or per item after</label>
                  <input
                    inputMode="numeric"
                    value={band.perItem}
                    placeholder="flat"
                    onChange={(event) => edit(index, { perItem: event.target.value })}
                    className="field py-2 text-sm"
                  />
                </div>
              )}
              {bands.length > 1 && (
                <button
                  type="button"
                  className="chip border-black/10 bg-white py-2.5 text-brand"
                  onClick={() =>
                    setBands((current) => current.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        className="btn-quiet w-full py-2 text-sm"
        onClick={() =>
          setBands((current) => {
            const previous = current[current.length - 1];
            return [
              ...current.slice(0, -1),
              // The old open band gets a ceiling, and the new one takes over
              // as the band that catches everything above it.
              { ...previous, maxItems: previous.maxItems || "10", perItem: "" },
              { maxItems: "", fee: previous.fee, perItem: "" },
            ];
          })
        }
      >
        Add a band
      </button>

      <p className="rounded-2xl bg-shell px-3 py-2 text-sm">
        {parsed
          .map((band, index) => {
            const from = index === 0 ? 1 : (parsed[index - 1].maxItems as number) + 1;
            const label = Number.isFinite(band.maxItems)
              ? `${from}-${band.maxItems}`
              : `${from}+`;
            if (band.perItem && index > 0) {
              const base = parsed[index - 1].fee;
              return `${label} items ${naira(base + band.perItem)} and ${naira(
                band.perItem
              )} each after`;
            }
            return `${label} items ${naira(band.fee)}`;
          })
          .join(" · ")}
      </p>
      <p className="text-xs text-muted">
        The first band is the price you quote out loud, and a flash drop moves
        every band down by the same amount. Changing these prices the next
        order placed, never one already placed. Put a price per item on the
        last band and it stops being one flat price for any load: the
        eleventh item costs what ten cost, plus that.
      </p>
    </div>
  );
}
