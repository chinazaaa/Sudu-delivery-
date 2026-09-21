"use client";

import { useState } from "react";
import { naira } from "@/lib/money";
import { serialiseValueBands, type ValueBand } from "@/lib/value-bands";

/**
 * Delivery priced by what the shopping comes to.
 *
 * A restaurant's ladder counts containers, because a car carrying twelve
 * takeaway boxes is a different car from one carrying two. A market is not
 * like that: eleven peppers and a bag of rice is one trip and two bags, and
 * the container ladder would call it eleven containers and charge nine
 * thousand naira for vegetables.
 *
 * What costs more at a market is bulk, and the honest measure of bulk is the
 * money. Empty leaves this restaurant on the ordinary ladder.
 */
export default function ValueBandEditor({ initial }: { initial: ValueBand[] }) {
  const [bands, setBands] = useState(
    initial.map((band) => ({
      upTo: Number.isFinite(band.upTo) ? String(band.upTo) : "",
      fee: String(band.fee),
    }))
  );

  const parsed: ValueBand[] = bands.map((band, index) => ({
    upTo:
      index === bands.length - 1 || band.upTo.trim() === ""
        ? Infinity
        : Number(band.upTo) || 0,
    fee: Number(band.fee) || 0,
  }));

  const edit = (index: number, patch: Partial<(typeof bands)[number]>) =>
    setBands(bands.map((one, at) => (at === index ? { ...one, ...patch } : one)));

  return (
    <div className="space-y-2">
      <input type="hidden" name="value_bands" value={bands.length === 0 ? "" : serialiseValueBands(parsed)} />

      {bands.length === 0 ? (
        <p className="text-sm text-muted">
          On the ordinary ladder, which counts containers.
        </p>
      ) : (
        <ul className="space-y-2">
          {bands.map((band, index) => {
            const last = index === bands.length - 1;
            const from = index === 0 ? 0 : (Number(bands[index - 1].upTo) || 0) + 1;
            return (
              <li key={index} className="flex flex-wrap items-end gap-2 rounded-xl bg-shell p-2.5">
                <div className="w-32">
                  <label className="label">
                    {last ? "Anything above" : "Shopping up to"}
                  </label>
                  <input
                    value={last ? "" : band.upTo}
                    onChange={(event) =>
                      edit(index, { upTo: event.target.value.replace(/\D/g, "") })
                    }
                    inputMode="numeric"
                    disabled={last}
                    placeholder={last ? "no ceiling" : "30000"}
                    className="field py-2 text-sm disabled:opacity-50"
                  />
                </div>
                <div className="w-28">
                  <label className="label">Delivery</label>
                  <input
                    value={band.fee}
                    onChange={(event) =>
                      edit(index, { fee: event.target.value.replace(/\D/g, "") })
                    }
                    inputMode="numeric"
                    className="field py-2 text-sm"
                  />
                </div>
                <p className="grow text-xs text-muted">
                  {last
                    ? `Over ${naira(from - 1)} of shopping, ${naira(Number(band.fee) || 0)}.`
                    : `${naira(from)} to ${naira(Number(band.upTo) || 0)} of shopping, ${naira(Number(band.fee) || 0)}.`}
                </p>
                <button
                  type="button"
                  onClick={() => setBands(bands.filter((_, at) => at !== index))}
                  className="chip border-black/10 bg-white text-sm"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() =>
          setBands([
            ...bands,
            { upTo: bands.length === 0 ? "30000" : "", fee: "4000" },
          ])
        }
        className="chip border-black/10 bg-white text-sm"
      >
        {bands.length === 0 ? "Price this one by what they spend" : "Add a band"}
      </button>

      <p className="text-xs text-muted">
        The last band catches everything above it, so no shop can fall through
        the bottom and price as nothing. Take every band away to put this
        restaurant back on the ordinary ladder.
      </p>
    </div>
  );
}
