"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/time";

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
      Pay within {countdown(remaining)} — this link closes when the batch does.
    </p>
  );
}
