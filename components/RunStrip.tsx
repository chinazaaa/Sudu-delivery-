"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";
import { naira } from "@/lib/money";
import type { BatchView } from "@/lib/view";

/** When the next car leaves. Stated once, plainly, wherever you are. */
export default function RunStrip({ run }: { run: BatchView }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = now === null ? "…" : countdown(new Date(run.cutOffISO).getTime() - now);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-paper px-4 py-3 shadow-card">
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
  );
}
