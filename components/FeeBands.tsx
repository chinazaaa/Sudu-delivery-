import type { ReactNode } from "react";

import { bandFor, bandTable, FEE_BANDS, type Band } from "@/lib/fees";
import { naira } from "@/lib/money";

/**
 * Why the delivery line says what it says.
 *
 * Delivery is priced by how many containers the order fills, so four items
 * can cost more than three and the number looks arbitrary unless the whole
 * ladder is there. Closed by default: someone who is not asking the question
 * should not have to read the answer.
 *
 * The same ladder answers the question for a car of its own, which is a
 * different set of numbers on the same rungs, plus a surcharge when it has
 * to leave within the hour. That one needs the surcharge on its own line:
 * folding it into the rung would make the ladder look wrong.
 *
 * No JavaScript of its own, so it works on the order page as well as at
 * checkout. Anything that needs a tap comes in as children.
 */
export default function FeeBands({
  itemCount,
  flashFee = null,
  bands = FEE_BANDS,
  extra = null,
  note,
  children,
}: {
  /** Containers in the order, used to mark the band it lands in. Zero marks
   *  nothing, because an empty cart has not landed anywhere yet. */
  itemCount: number;
  /** A drop for one run moves every band down by the same amount. */
  flashFee?: number | null;
  bands?: Band[];
  /** A charge that is not part of the ladder, on its own line under it. */
  extra?: { label: string; fee: number } | null;
  /** Replaces the sentence under the ladder where the ladder is not a run. */
  note?: string;
  /** The way out, where there is one: a run for less, one tap away. */
  children?: ReactNode;
}) {
  const rows = bandTable(flashFee, bands);
  const here = itemCount > 0 ? bands.indexOf(bandFor(itemCount, bands)) : -1;

  return (
    <details className="group text-sm sm:mt-1">
      <summary className="cursor-pointer list-none text-muted underline decoration-dotted underline-offset-4">
        Why this much?
      </summary>

      <ul className="mt-2 space-y-1 rounded-xl bg-black/[0.03] p-3">
        {rows.map((row, index) => (
          <li
            key={row.label}
            className={`flex justify-between ${
              index === here ? "font-bold text-ink" : "text-muted"
            }`}
          >
            <span>
              {row.label}
              {index === here && " · yours"}
            </span>
            <span>{naira(row.fee)}</span>
          </li>
        ))}

        {extra && (
          <li className="flex justify-between border-t border-black/10 pt-1 font-bold text-ink">
            <span>{extra.label}</span>
            <span>+{naira(extra.fee)}</span>
          </li>
        )}
      </ul>

      <p className="mt-2 text-muted">
        {note ??
          "One fee for the whole order, however many restaurants are in it. It is the car, not the food, so it goes by how much room your order takes."}
      </p>

      {children}
    </details>
  );
}
