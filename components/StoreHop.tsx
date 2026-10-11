"use client";

import { useEffect } from "react";

/**
 * The hop to the store, done from the browser rather than the server.
 *
 * This page used to answer an iPhone with a 307 straight to the App Store.
 * The store opened, which is what somebody tapping "Get the app" wants, but
 * the page behind it was never HTML at all: there was no body to leave
 * behind, so the browser sat on a header and a footer with nothing between
 * them. Going back asked for the same address and got the same redirect, so
 * it never recovered. In an in-app browser, which is where most of these
 * taps come from, that is the whole screen.
 *
 * So the page renders first and the hop happens after it. The store still
 * opens by itself, and whatever the browser does afterwards, what is under
 * it is a real page with both buttons on it.
 *
 * Once per tab. Coming back from the store re-runs this, and a page that
 * hopped again every time it was looked at would be a trap rather than a
 * shortcut.
 */
export default function StoreHop({ to }: { to: string }) {
  useEffect(() => {
    if (to === "") return;

    const key = "sudu.store-hop";
    try {
      if (sessionStorage.getItem(key) === to) return;
      sessionStorage.setItem(key, to);
    } catch {
      // A browser with storage switched off still gets the page, and the
      // buttons on it. It is the automatic hop that is given up, not the
      // way to the store.
      return;
    }

    // After paint, so the page exists behind whatever the store does to
    // the window. iOS usually cancels this navigation outright and opens
    // the App Store app instead, which leaves the page exactly where it
    // is; where it does not, this page stays in the history so Back comes
    // to it rather than skipping past it, and the guard above stops it
    // hopping a second time when it does.
    const timer = setTimeout(() => {
      window.location.href = to;
    }, 400);
    return () => clearTimeout(timer);
  }, [to]);

  return null;
}
