"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** The id is random and lives in this browser only: it counts people without
 *  knowing who they are. */
function visitorId(): string {
  try {
    const key = "sudu_visitor";
    const found = window.localStorage.getItem(key);
    if (found) return found;

    const made =
      typeof crypto?.randomUUID === "function"
        ? crypto.randomUUID()
        : String(Math.random()).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(key, made);
    return made;
  } catch {
    // Private mode. The visit still counts, it just counts as a new person.
    return "anon-" + Math.random().toString(36).slice(2, 12);
  }
}

/**
 * Counts a page view, after the page is already on screen.
 *
 * Fire and forget: it never blocks a render, never shows an error, and a
 * failure here does nothing at all to somebody trying to order.
 */
export default function Track() {
  const path = usePathname();

  useEffect(() => {
    if (!path || path.startsWith("/admin") || path.startsWith("/promoter")) return;

    const body = JSON.stringify({
      path,
      visitor: visitorId(),
      // The host only: which group or which site sent them, not the full URL.
      referrer: (() => {
        try {
          return document.referrer ? new URL(document.referrer).hostname : "";
        } catch {
          return "";
        }
      })(),
    });

    try {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* Nothing to do about it, and nothing to tell anybody. */
    }
  }, [path]);

  return null;
}
