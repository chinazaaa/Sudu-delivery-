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
/*
 * And it stops asking once nobody is watching.
 *
 * A refresh is the whole page built again on the server. An order page left
 * open in a pocket overnight asked two thousand times for an answer that
 * changed twice. Ten quiet minutes and it stops; touching the page, or
 * coming back to the tab, starts it again and refreshes on the spot, so
 * somebody waiting on their food never notices.
 */
const QUIET_FOR = 600_000;

export default function LiveOrder({ every = 60000 }: { every?: number }) {
  const router = useRouter();

  useEffect(() => {
    let touched = Date.now();

    const tick = () => {
      if (document.visibilityState !== "visible" || !canReach()) return;
      if (Date.now() - touched > QUIET_FOR) return;
      router.refresh();
    };

    const here = () => {
      const slept = Date.now() - touched > QUIET_FOR;
      touched = Date.now();
      if (slept) tick();
    };
    const back = () => {
      touched = Date.now();
      tick();
    };

    const timer = setInterval(tick, every);
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    // The connection coming back is the moment the page is most out of date,
    // and the moment a refresh will actually work.
    window.addEventListener("online", back);
    window.addEventListener("pointerdown", here, { passive: true });
    window.addEventListener("scroll", here, { passive: true });
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
      window.removeEventListener("online", back);
      window.removeEventListener("pointerdown", here);
      window.removeEventListener("scroll", here);
    };
  }, [router, every]);

  return null;
}
