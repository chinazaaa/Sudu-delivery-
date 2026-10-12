"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * A new page starts at the top of itself, without showing the bottom first.
 *
 * Tapping a link from halfway down a long page used to land on the footer
 * for a moment and then jump up. Nothing was scrolling down: the browser
 * keeps the old offset while the new page renders, and when the new page is
 * shorter than the old one it clamps that offset to the new document's
 * height, which is the very bottom. The reset that follows is correct and
 * too late to matter, because the wrong frame has already been painted.
 *
 * So the reset happens in a layout effect, which React runs after the new
 * page commits and before the browser paints it, and the bottom is never
 * drawn at all. Admin has done this with an ordinary effect for a while;
 * its pages are short enough that the clamp had nowhere to land.
 *
 * Keyed on the path alone. A page that changes its own query, the way the
 * menu does when a chip is tapped or a page of skincare is turned, is
 * somebody still reading the page they are on, and yanking them to the top
 * of it would be its own bug.
 */
export default function ToTop() {
  const path = usePathname();
  // Back and forward are the browser's to answer. It remembers where
  // somebody was on the page they are returning to, and that memory is the
  // whole point of pressing back.
  const back = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const went = () => {
      back.current = true;
    };
    window.addEventListener("popstate", went);
    return () => window.removeEventListener("popstate", went);
  }, []);

  useLayoutEffect(() => {
    // The page somebody arrived on is already where they asked to be,
    // deep link, hash and all.
    if (first.current) {
      first.current = false;
      return;
    }
    if (back.current) {
      back.current = false;
      return;
    }
    // #something in the address is a request for that part of the page.
    if (window.location.hash !== "") return;
    window.scrollTo(0, 0);
  }, [path]);

  return null;
}
