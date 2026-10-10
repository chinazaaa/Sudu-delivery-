"use client";

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
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Nothing is awaited and nothing is shown. A browser that refuses, or a
    // development machine on plain http where workers are off, simply has no
    // notifications, and admin works exactly as before.
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);

  return null;
}
