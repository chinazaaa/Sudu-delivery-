"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Admin pages that go stale on their own: orders land, transfers are matched,
 * carts are abandoned. The page comes back for them rather than being
 * refreshed by hand, and only while it is actually being looked at.
 */
export default function AdminLive({ every = 25000 }: { every?: number }) {
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
