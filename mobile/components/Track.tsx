import { useEffect } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { api } from "@/lib/api";
import { visitorId } from "@/lib/store";

/**
 * "/order/abc" in the app and "/o/abc" on the website are the same page to
 * anybody reading the numbers, so the app says what the website would say.
 * Counting them apart would split every figure in analytics in two and answer
 * a question nobody asked.
 */
function asWebPath(path: string): string {
  if (path.startsWith("/order/")) return "/o/" + path.slice("/order/".length);
  return path;
}

/**
 * Counts a screen, after it is already on screen.
 *
 * Fire and forget: it never blocks a render, never shows an error, and a
 * failure here does nothing at all to somebody trying to order.
 */
export default function Track() {
  const path = usePathname();

  useEffect(() => {
    if (!path || !path.startsWith("/")) return;
    let alive = true;
    void visitorId().then((visitor) => {
      if (alive) void api.track(asWebPath(path), visitor, Platform.OS);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  return null;
}
