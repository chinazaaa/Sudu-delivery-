"use client";

import { useEffect, useState } from "react";
import { clockLabel, countdown } from "@/lib/time";

/** How long is left to pay. The link dies at the batch cut-off (brief §3a). */
export default function ExpiryNote({ cutOffISO }: { cutOffISO: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (now === null) return null;
  const remaining = new Date(cutOffISO).getTime() - now;
  if (remaining <= 0) return null;

  return (
    <p className="text-sm text-brand-dark">
      {/* The deadline as a time, then the countdown. A number of hours is a
          sum somebody has to do while deciding whether to pay now. */}
      Pay by {clockLabel(cutOffISO)}, {countdown(remaining)} from now. This link
      closes when the batch does.
    </p>
  );
}
