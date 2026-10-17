"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Puts the service worker in place, on admin only.
 *
 * It lives in the admin layout rather than the settings page because the
 * worker is what draws a notification and what opens the right page when one
 * is tapped, and neither of those should depend on somebody having the
 * settings screen open. The customer side has no notifications yet, so it is
 * not given a worker it would do nothing with.
 *
 * The file is served from the site root, so its scope is the whole site and a
 * notification tapped from a cold phone can open any page.
 */
export default function RegisterWorker() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Nothing is awaited and nothing is shown. A browser that refuses, or a
    // development machine on plain http where workers are off, simply has no
    // notifications, and admin works exactly as before.
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

    /*
     * Where a tapped notification wanted to go.
     *
     * The worker's own way of sending an open window somewhere is refused
     * in an installed app on iOS, which is where this is mostly read:
     * tapping a notification brought the app to the front on whatever page
     * it had been left on, which looks exactly like the notification
     * having done nothing. So the worker tells the page instead, and the
     * page routes there the way it routes to anything else.
     */
    const go = (event: MessageEvent) => {
      const sent = event.data as { type?: string; url?: string } | null;
      if (!sent || sent.type !== "sudu:go") return;
      const url = String(sent.url ?? "");
      if (!url.startsWith("/")) return;
      router.push(url);
    };

    navigator.serviceWorker.addEventListener("message", go);
    return () => navigator.serviceWorker.removeEventListener("message", go);
  }, [router]);

  return null;
}
