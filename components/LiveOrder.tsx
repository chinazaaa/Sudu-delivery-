"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps an order page honest without anyone pulling to refresh. Payment is
 * matched by hand and the run's stage is tapped by hand, so the page has to
 * come back for them: every half minute while it is open, and immediately
 * whenever the phone comes back to it.
 */
export default function LiveOrder({ every = 30000 }: { every?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [router, every]);

  return null;
}
