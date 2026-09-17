"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";
import { naira } from "@/lib/money";
import type { BatchView } from "@/lib/view";

/** When the next car leaves. Stated once, plainly, wherever you are. */
export default function RunStrip({
  run,
  note,
}: {
  run: BatchView;
  /** A second line inside the same card. The home page puts what delivery
   *  costs here rather than stacking another card under this one, which on a
   *  short phone pushed the first restaurant further down the page. */
  note?: React.ReactNode;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = now === null ? "…" : countdown(new Date(run.cutOffISO).getTime() - now);

  return (
    <div className="rounded-2xl bg-paper px-4 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-brand" />
        </span>
        <span className="font-bold">{run.label} batch closes in {left}</span>
        <span className="text-sm text-muted">{run.deliveryWindow}</span>
        {run.flashFee !== null && (
          <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">
            {naira(run.flashFee)} delivery
          </span>
        )}
      </div>
      {note && <div className="mt-2 border-t border-black/5 pt-2">{note}</div>}
    </div>
  );
}
