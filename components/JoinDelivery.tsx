"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "sudu_join_v1";

export type Joining = { id: string; name: string } | null;

/** What this browser is currently joining, if anything. */
export function readJoin(): Joining {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Joining) : null;
  } catch {
    return null;
  }
}

export function clearJoin(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* A browser with storage switched off still orders, just on its own. */
  }
}

/**
 * Takes the join, then sends them to the menu.
 *
 * Kept in the browser beside the cart rather than in the address, because the
 * whole point is that they wander off round the menu and it is still true when
 * they reach checkout.
 */
export default function JoinDelivery({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [going, setGoing] = useState(false);

  // Landing on somebody else's link with a half-built cart of your own is
  // fine: the cart is yours either way, and only the delivery is shared.
  useEffect(() => {
    return () => {
      /* Nothing to undo. */
    };
  }, []);

  const start = () => {
    setGoing(true);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ id, name }));
    } catch {
      /* Without storage they simply order on their own, which still works. */
    }
    router.push("/");
  };

  return (
    <button type="button" onClick={start} disabled={going} className="btn-primary w-full">
      {going ? "Opening the menu…" : `Add my food to ${name}'s delivery`}
    </button>
  );
}
