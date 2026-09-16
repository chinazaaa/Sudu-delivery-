"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";
import { naira } from "@/lib/money";

/**
 * The run clock, on the storefront where everyone sees it. It is the only
 * urgency on the site and it is real: the driver actually leaves at that time.
 */
export default function CountdownBanner({
  label,
  cutOffISO,
  cutOffLabel,
  deliveryWindow,
  flashFee,
  flashReason,
}: {
  label: string;
  cutOffISO: string;
  cutOffLabel: string;
  deliveryWindow: string;
  flashFee: number | null;
  flashReason: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const left = now === null ? "…" : countdown(new Date(cutOffISO).getTime() - now);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-ink px-4 py-3 text-white">
      <span className="flex items-center gap-2 font-semibold">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-brand" />
        </span>
        {label} closes in {left}
      </span>
      <span className="text-sm text-white/65">
        Orders close {cutOffLabel} · {deliveryWindow}
      </span>
      {flashFee !== null && (
        <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold">
          {naira(flashFee)} delivery {flashReason && `· ${flashReason}`}
        </span>
      )}
    </div>
  );
}
