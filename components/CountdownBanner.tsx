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
    <div className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-center text-white">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-brand" />
      </span>
      <span className="font-semibold">
        {label} closes in {left}
      </span>
      {flashFee !== null && (
        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold">
          {naira(flashFee)} delivery
        </span>
      )}
    </div>
  );
}
