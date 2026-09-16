"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";

export type BatchTick = { label: string; cutOffISO: string };

/**
 * The site's only urgency, and it is honest urgency: a real cut-off ticking
 * down. The second line matters as much as the first. Without it a student
 * who misses a cut-off assumes that is the end and leaves (brief §9).
 */
export default function Countdown({
  current,
  next,
}: {
  current: BatchTick;
  next: BatchTick | null;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Rendered blank on the server so the markup cannot go stale in a cache.
  const remaining = (iso: string) =>
    now === null ? "…" : countdown(new Date(iso).getTime() - now);

  return (
    <div className="rounded-lg bg-brand/5 px-3 py-2 text-sm leading-6">
      <p className="font-semibold text-brand-dark">
        {current.label} batch closes in {remaining(current.cutOffISO)}
      </p>
      {next ? (
        <p className="text-ink/75">
          Next batch ({next.label}) closes in {remaining(next.cutOffISO)}. You can
          order for it now.
        </p>
      ) : (
        <p className="text-ink/75">This is the last batch currently open.</p>
      )}
    </div>
  );
}
