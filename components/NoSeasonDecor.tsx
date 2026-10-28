"use client";

import { useEffect } from "react";

/**
 * No floating season on this page.
 *
 * The decoration is a fixed layer drawn by the layout, so a page cannot
 * simply not render it: it is not a child of anything a page owns. It can
 * ask for it to be left off while it is open, which is what this does, and
 * put it back on the way out so the rest of the shop keeps its season.
 *
 * For a shelf that is already dressed for an occasion of its own. Halloween
 * bats drifting across a Christmas hamper read as a page nobody looked at.
 */
export default function NoSeasonDecor() {
  useEffect(() => {
    document.documentElement.classList.add("no-season-decor");
    return () => document.documentElement.classList.remove("no-season-decor");
  }, []);
  return null;
}
