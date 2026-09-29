"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  FROM_COOKIE,
  REMEMBER_FOR,
  channelOfSite,
  tidyChannel,
} from "@/lib/came-from";

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

/** What is already remembered, if anything. First touch wins. */
function alreadyFrom(): string {
  try {
    const found = document.cookie
      .split(";")
      .map((one) => one.trim())
      .find((one) => one.startsWith(`${FROM_COOKIE}=`));
    return found ? decodeURIComponent(found.slice(FROM_COOKIE.length + 1)) : "";
  } catch {
    return "";
  }
}

/**
 * Where this visit came from, worked out once and then left alone.
 *
 * A utm_source on the link is taken first, because it is the only one of
 * the two that is deliberate: it is on a link we wrote and put somewhere.
 * Failing that, the referring site, which is how a Google search gets
 * counted at all, since nobody can add a parameter to an organic result.
 *
 * Instagram is the reason both are needed. A link in a bio carries whatever
 * we put on it, but the in-app browser often sends no referrer, so without
 * the parameter half of Instagram would be counted as somebody typing the
 * address in from memory.
 */
function whereFrom(said: string): string {
  const onTheLink = tidyChannel(said);
  if (onTheLink !== "") return onTheLink;

  try {
    if (!document.referrer) return "direct";
    const host = new URL(document.referrer).hostname;
    // Our own pages are not a source. Somebody walking from the menu to the
    // checkout has not just arrived from anywhere.
    if (host === window.location.hostname) return "";
    return channelOfSite(host) || "";
  } catch {
    return "";
  }
}

/**
 * Counts a page view, after the page is already on screen.
 *
 * Fire and forget: it never blocks a render, never shows an error, and a
 * failure here does nothing at all to somebody trying to order.
 */
function Counter() {
  const path = usePathname();
  const query = useSearchParams();

  useEffect(() => {
    if (!path || path.startsWith("/admin") || path.startsWith("/promoter")) return;

    // Where they came from, remembered for ninety days and never
    // overwritten: whatever introduced somebody introduced them once, and a
    // second visit from a bookmark does not make them a direct customer.
    let cameFrom = alreadyFrom();
    if (cameFrom === "") {
      cameFrom = whereFrom(
        query?.get("utm_source") ?? query?.get("ref") ?? query?.get("from") ?? ""
      );
      if (cameFrom !== "") {
        try {
          document.cookie =
            `${FROM_COOKIE}=${encodeURIComponent(cameFrom)}; path=/; ` +
            `max-age=${REMEMBER_FOR}; samesite=lax`;
        } catch {
          /* A browser that refuses cookies still gets to order. */
        }
      }
    }

    const body = JSON.stringify({
      cameFrom,
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
  }, [path, query]);

  return null;
}

/**
 * useSearchParams makes everything above it render on the client, so it is
 * wrapped rather than left to take the whole page down with it.
 */
export default function Track() {
  return (
    <Suspense fallback={null}>
      <Counter />
    </Suspense>
  );
}
