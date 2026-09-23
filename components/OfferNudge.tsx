"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Nudge } from "@/lib/coupons";

/** Remembers which offer somebody has already waved away. */
const KEY = "sudu.offer.seen";

/**
 * Pages where an offer is an interruption rather than an invitation.
 *
 * Somebody in the cart or at checkout has already decided; a card sliding in
 * over the total is the thing that makes them close the tab. Admin and the
 * promoter desk are not shopping at all.
 */
const QUIET = ["/cart", "/checkout", "/admin", "/promoter", "/o/", "/orders", "/join"];

/**
 * A small card that says what is on offer today, once.
 *
 * Deliberately not a sheet over the whole screen: it sits in the corner, the
 * page carries on underneath it, and one tap on the cross ends it for that
 * offer for good. The wording comes from the offer itself, so it can never
 * promise something the shop no longer does.
 *
 * It never names the code. These offers apply themselves, and putting a code
 * on screen only sends people hunting for a box to type it into.
 */
export default function OfferNudge({ nudge }: { nudge: Nudge | null }) {
  const path = usePathname();
  const [up, setUp] = useState(false);

  const quiet = !nudge || QUIET.some((start) => path === start || path.startsWith(start));

  useEffect(() => {
    if (quiet || !nudge) return;
    let seen = "";
    try {
      seen = window.localStorage.getItem(KEY) ?? "";
    } catch {
      /* Storage blocked. Show it; the cross still works for this visit. */
    }
    if (seen === nudge.code) return;

    // A beat after the page settles, so it reads as an offer rather than as
    // something in the way of the page loading.
    const timer = window.setTimeout(() => setUp(true), 1200);
    return () => window.clearTimeout(timer);
  }, [quiet, nudge, path]);

  if (quiet || !nudge) return null;

  const close = () => {
    setUp(false);
    try {
      window.localStorage.setItem(KEY, nudge.code);
    } catch {
      /* Nothing to remember it with. It will come back next visit. */
    }
  };

  return (
    <div
      role="complementary"
      aria-label="Today's offer"
      className={`pointer-events-none fixed inset-x-3 z-30 transition-all duration-300 sm:inset-x-auto sm:right-5 sm:w-80 ${
        up ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
      // Clear of the tab bar and a sticky cart bar on a phone, and low on the
      // screen on a laptop where neither of those is in the way.
      style={{ bottom: "calc(150px + env(safe-area-inset-bottom))" }}
    >
      <div
        className={`${
          up ? "pointer-events-auto" : ""
        } rounded-2xl border border-black/5 bg-paper p-4 shadow-card`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-extrabold leading-tight">
            {nudge.badge}
            {nudge.where && <span className="font-bold"> from {nudge.where}</span>}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-full px-2 py-1 text-lg leading-none text-muted"
          >
            ×
          </button>
        </div>

        <p className="mt-1 text-sm leading-snug text-muted">{nudge.detail}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {nudge.go.slice(0, 3).map((one) => (
            <Link
              key={one.href}
              href={one.href}
              onClick={close}
              className="rounded-full bg-brand px-3.5 py-2 text-sm font-extrabold text-white"
            >
              {one.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={close}
            className="px-1 text-sm font-semibold text-muted underline"
          >
            Not interested
          </button>
        </div>
      </div>
    </div>
  );
}
