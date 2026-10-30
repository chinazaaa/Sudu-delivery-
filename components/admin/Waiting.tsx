"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * What is waiting, by section, kept beside the rail rather than in front
 * of it.
 *
 * Read in the admin layout, these eight counts were eight round trips to a
 * database in Lagos between every tap and anything happening on the screen.
 * A loading screen could not cover it either: `loading.tsx` sits inside the
 * layout, so none of it can be drawn until the layout has finished asking.
 *
 * A badge is decoration and may arrive a moment late. The frame is never
 * torn down as you move around the board, so this is asked once when the
 * board opens and again each minute, instead of on every navigation.
 */
const Held = createContext<Record<string, number>>({});

export function useWaiting(): Record<string, number> {
  return useContext(Held);
}

/** How often to ask again. A minute: these are things to do today, not a
 *  live feed, and a phone in a pocket should not be talking all afternoon. */
const AGAIN = 60_000;

export default function Waiting({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;

    const ask = async () => {
      try {
        const answer = await fetch("/api/admin/waiting", { cache: "no-store" });
        if (!answer.ok) return;
        const got = (await answer.json()) as Record<string, number>;
        if (alive) setCounts(got);
      } catch {
        /* A number on a menu is never worth a broken board. */
      }
    };

    void ask();
    /*
     * Only while somebody is looking at it.
     *
     * The clock does not stop in a background tab, so a board left open on
     * a laptop asked all night for numbers nobody read. It waits for the
     * page to come back instead, which it already does below.
     */
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void ask();
    }, AGAIN);

    // And again when the phone comes back, because a board left open in a
    // pocket all afternoon is showing this morning's numbers.
    const wake = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", wake);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return <Held.Provider value={counts}>{children}</Held.Provider>;
}
