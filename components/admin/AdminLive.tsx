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
/**
 * How long a page nobody is touching keeps asking.
 *
 * A refresh is a whole page built again on the server, and admin pages are
 * the dearest ones we have. A board left open on the counter all day was
 * building itself every twenty-five seconds whether anybody looked at it
 * or not: on a nine hour day that is thirteen hundred renders for one
 * glance at it in the afternoon, which is most of a month's compute spent
 * on an empty room.
 *
 * So it gives up after ten quiet minutes and comes straight back the
 * moment somebody touches the page, tabs to it, or the connection
 * returns. Whoever is standing in front of it never waits; the empty room
 * costs nothing.
 */
const QUIET_FOR = 600_000;

export default function AdminLive({ every = 60000 }: { every?: number }) {
  const router = useRouter();

  useEffect(() => {
    let touched = Date.now();

    const tick = () => {
      if (document.visibilityState !== "visible" || !canReach()) return;
      if (Date.now() - touched > QUIET_FOR) return;
      router.refresh();
    };

    // Anything that says somebody is there. Coming back to the page is also
    // the moment it is most out of date, so it refreshes on the spot rather
    // than waiting for the next turn of the clock.
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
    window.addEventListener("online", back);
    window.addEventListener("pointerdown", here, { passive: true });
    window.addEventListener("keydown", here);
    window.addEventListener("scroll", here, { passive: true });
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
      window.removeEventListener("online", back);
      window.removeEventListener("pointerdown", here);
      window.removeEventListener("keydown", here);
      window.removeEventListener("scroll", here);
    };
  }, [router, every]);

  return null;
}
