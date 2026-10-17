"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Picked = {
  on: Set<string>;
  toggle: (id: string) => void;
  set: (ids: string[]) => void;
};

const Held = createContext<Picked | null>(null);

/**
 * Ticking several rows and doing one thing to the lot.
 *
 * Written once because two boards want it: the stock board, where the
 * desserts go off together when there is no cold bag, and the left behind
 * board, where a morning of testing leaves six carts of your own in among
 * the real ones.
 *
 * The state lives in here rather than on the page so the list underneath
 * stays a server component: every row is still rendered on the server with
 * its real figures, and only the tick beside it knows about React.
 */
export function Picking({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState<Set<string>>(new Set());

  const value = useMemo<Picked>(
    () => ({
      on,
      toggle: (id) =>
        setOn((was) => {
          const next = new Set(was);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      set: (ids) => setOn(new Set(ids)),
    }),
    [on]
  );

  return <Held.Provider value={value}>{children}</Held.Provider>;
}

/** What is ticked, for a bar that acts on it. Null outside a Picking. */
export function usePicked(): Picked | null {
  return useContext(Held);
}

/** The tick beside one row. */
export function Tick({ id, name }: { id: string; name: string }) {
  const held = usePicked();
  if (!held) return null;

  return (
    <label className="flex shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        checked={held.on.has(id)}
        onChange={() => held.toggle(id)}
        aria-label={`Pick ${name}`}
        className="size-[18px] accent-[#e5321d]"
      />
    </label>
  );
}

/**
 * Everything showing, ticked at once.
 *
 * It reads the rows off the page rather than being handed a list, because
 * some of these pages filter in the browser with CSS: the server has no idea
 * which rows are showing, and `offsetParent` is the one thing that does.
 */
export function showingNow(): string[] {
  if (typeof document === "undefined") return [];
  return [...document.querySelectorAll<HTMLElement>("[data-item][data-id]")]
    .filter((row) => row.offsetParent !== null)
    .map((row) => row.dataset.id ?? "")
    .filter(Boolean);
}
