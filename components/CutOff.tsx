"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";

/**
 * How long is left to order for the run at the top of the page.
 *
 * The page used to open on a timetable and it was cut back to one sentence,
 * which read better and quietly took the deadline with it. A time you can
 * still make is the reason to order now rather than later, and "closes in
 * 6m 49s" is the only part of the old strip that was doing that work.
 *
 * It waits for the clock rather than rendering one on the server: the
 * server's second and the phone's are never the same, and a countdown that
 * jumps on the first tick looks broken. Empty until then, so nothing moves
 * about underneath it.
 *
 * It appears only when the cut-off is close. A countdown reading "1d 4h" is
 * a timetable again, and a deadline nobody can miss is not a deadline. Past
 * the cut-off it says nothing at all: the sentence above it has already
 * moved on to the next way of getting food here.
 */
export default function CutOff({
  at,
  /** How near it has to be to be worth saying. Two hours: long enough to
   *  still be true when somebody is deciding, short enough to mean it. */
  within = 2 * 60 * 60 * 1000,
}: {
  at: string;
  within?: number;
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const shut = new Date(at).getTime();
    if (!Number.isFinite(shut)) return;

    const tick = () => setLeft(shut - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [at]);

  if (left === null || left <= 0 || left > within) return null;

  return (
    <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-brand-dark">
      <span className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-brand" />
      </span>
      Orders close in {countdown(left)}
    </span>
  );
}
