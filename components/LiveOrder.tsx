"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { canReach } from "@/lib/reachable";

/**
 * Keeps an order page honest without anyone pulling to refresh. Payment is
 * matched by hand and the run's stage is tapped by hand, so the page has to
 * come back for them: every half minute while it is open, and immediately
 * whenever the phone comes back to it.
 *
 * Never while the phone has no connection. Coming back to the tab is exactly
 * when it is most likely to have none, because the phone has been asleep in
 * somebody's pocket and the browser has dropped the connection. The refresh
 * then fails, and a failed refresh is not a quiet nothing: it throws, the
 * error boundary catches it, and somebody looking at their own paid order is
 * told "That did not go through. Nothing was changed" over the words "Load
 * failed", which reads as the order having fallen over.
 *
 * So it waits for the connection instead, and refreshes when it is back.
 */
export default function LiveOrder({ every = 30000 }: { every?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && canReach()) router.refresh();
    };
    const timer = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    // The connection coming back is the moment the page is most out of date,
    // and the moment a refresh will actually work.
    window.addEventListener("online", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
    };
  }, [router, every]);

  return null;
}
