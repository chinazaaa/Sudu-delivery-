"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { Nudge } from "@/lib/coupons";

/** Remembers what somebody has already waved away, one key per thing. */
const OFFER_KEY = "sudu.offer.seen";
const APP_KEY = "sudu.app.seen";

/**
 * Pages where a card is an interruption rather than an invitation.
 *
 * Somebody in the cart or at checkout has already decided; a card sliding in
 * over the total is the thing that makes them close the tab. Admin and the
 * promoter desk are not shopping at all.
 */
const QUIET = ["/cart", "/checkout", "/admin", "/promoter", "/o/", "/orders", "/join"];

/**
 * One small card in the corner, and never two.
 *
 * It has two things it might say: what is on offer today, and that there is
 * an iPhone app. The offer wins where there is one, because it is worth
 * money to whoever is reading. Each is dismissed on its own and stays
 * dismissed, so waving away the offer is not also waving away the app.
 *
 * Deliberately not a sheet over the whole screen: the page carries on
 * underneath, and one tap on the cross ends it for good.
 */
export default function OfferNudge({
  nudge,
  appId = "",
  appQr = "",
}: {
  nudge: Nudge | null;
  /** The App Store id. Empty means the shop has no app to mention. */
  appId?: string;
  /** The App Store address as a square, for a screen that cannot install it. */
  appQr?: string;
}) {
  const path = usePathname();
  const [up, setUp] = useState(false);
  // Decided after mount: what to show depends on the phone, and the server
  // has no idea what anybody is holding.
  const [showing, setShowing] = useState<"offer" | "app" | null>(null);
  // A screen that cannot install an app is offered the square instead.
  const [onADesk, setOnADesk] = useState(false);

  const quiet = QUIET.some((start) => path === start || path.startsWith(start));

  useEffect(() => {
    if (quiet) return;

    const seen = (key: string) => {
      try {
        return window.localStorage.getItem(key) ?? "";
      } catch {
        // Storage blocked. Show it; the cross still works for this visit.
        return "";
      }
    };

    let next: "offer" | "app" | null = null;
    if (nudge && seen(OFFER_KEY) !== nudge.code) {
      next = "offer";
    } else if (appId !== "" && seen(APP_KEY) !== appId) {
      const ua = window.navigator.userAgent;
      const iPhone = /iPad|iPhone|iPod/.test(ua);
      // No Android app yet, so an Android phone is told nothing: an App
      // Store link is no use to somebody who cannot open it.
      const android = /Android/.test(ua);
      // Safari draws Apple's own bar from the tag in the layout, and two
      // asks on one screen is the thing we are trying not to be. Chrome,
      // Firefox and the browser inside Instagram get no such bar, which is
      // where most links are opened anyway.
      const realSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua);

      if (iPhone && !realSafari) {
        next = "app";
      } else if (!iPhone && !android && appQr !== "") {
        // A laptop. It cannot install anything, so it holds up the square
        // and the phone does the rest.
        next = "app";
        setOnADesk(true);
      }
    }
    if (!next) return;

    setShowing(next);
    // A beat after the page settles, so it reads as an offer rather than as
    // something in the way of the page loading.
    const timer = window.setTimeout(() => setUp(true), 1200);
    return () => window.clearTimeout(timer);
  }, [quiet, nudge, appId, appQr, path]);

  if (quiet || showing === null) return null;

  const close = () => {
    setUp(false);
    try {
      window.localStorage.setItem(
        showing === "offer" ? OFFER_KEY : APP_KEY,
        showing === "offer" ? (nudge?.code ?? "") : appId
      );
    } catch {
      /* Nothing to remember it with. It will come back next visit. */
    }
    // Gone for this page too, rather than fading to an invisible card that
    // still catches taps.
    window.setTimeout(() => setShowing(null), 300);
  };

  return (
    <div
      role="complementary"
      aria-label={showing === "offer" ? "Today's offer" : "The Sudu app"}
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
            {showing === "offer" ? (
              <>
                {nudge?.badge}
                {nudge?.where && <span className="font-bold"> from {nudge.where}</span>}
              </>
            ) : (
              "Sudu is on the App Store"
            )}
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

        <p className="mt-1 text-sm leading-snug text-muted">
          {showing === "offer"
            ? nudge?.detail
            : onADesk
              ? "Point your phone's camera at this and it opens on the App Store."
              : "The same shop, on your home screen. Your orders and where they have got to, without signing in every time."}
        </p>

        {/* The square only on a screen that cannot install anything. On a
            phone it would be asking somebody to photograph the thing they
            are already holding. */}
        {showing === "app" && onADesk && appQr !== "" && (
          <div
            className="mt-3 flex justify-center rounded-xl bg-shell p-3"
            aria-hidden
            dangerouslySetInnerHTML={{ __html: appQr }}
          />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {showing === "offer" ? (
            nudge?.go.slice(0, 3).map((one) => (
              <Link
                key={one.href}
                href={one.href}
                onClick={close}
                className="rounded-full bg-brand px-3.5 py-2 text-sm font-extrabold text-white"
              >
                {one.label}
              </Link>
            ))
          ) : (
            <a
              href={`https://apps.apple.com/app/id${appId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="rounded-full bg-brand px-3.5 py-2 text-sm font-extrabold text-white"
            >
              {onADesk ? "Open it here" : "Get the app"}
            </a>
          )}
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
