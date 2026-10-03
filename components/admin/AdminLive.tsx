"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { canReach } from "@/lib/reachable";

/**
 * Admin pages that go stale on their own: orders land, transfers are matched,
 * carts are abandoned. The page comes back for them rather than being
 * refreshed by hand, and only while it is actually being looked at, and only
 * while the phone can reach us: a refresh that cannot throws, and an error
 * screen over the run sheet at the counter is worse than a stale one.
 */
export default function AdminLive({ every = 25000 }: { every?: number }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && canReach()) router.refresh();
    };
    const timer = setInterval(tick, every);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
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
