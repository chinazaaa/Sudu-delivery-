"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Keeps a section heading where it was when you tapped it.
 *
 * A folded list where only one section is open at a time has a problem
 * nobody sees until they use it on a phone: opening a section closes the
 * one above, and the one above was two hundred rows tall. The page shrinks
 * by three screens while your scroll offset stays where it was, so tapping
 * "Dry cleaning" lands you in the footer.
 *
 * The browser has no idea anything moved, so this measures. Before the
 * state changes, where the heading you tapped sits in the window is
 * written down. After the layout settles, the page is scrolled by however
 * far it drifted, which puts the heading back under your thumb with its
 * section open beneath it.
 */
export function useKeepPlace(open: string) {
  /** The heading elements, by section name, so one can be measured. */
  const headers = useRef<Record<string, HTMLElement | null>>({});
  const held = useRef<{ name: string; top: number } | null>(null);

  useLayoutEffect(() => {
    const hold = held.current;
    held.current = null;
    if (!hold) return;
    const node = headers.current[hold.name];
    if (!node) return;
    const drift = node.getBoundingClientRect().top - hold.top;
    // A pixel of rounding is not a jump, and scrolling for it would fight
    // the browser's own smoothing.
    if (Math.abs(drift) > 1) window.scrollBy(0, drift);
  }, [open]);

  /** Call in the click handler, before setting the open section. */
  const hold = (name: string) => {
    const node = headers.current[name];
    held.current = node ? { name, top: node.getBoundingClientRect().top } : null;
  };

  /** Put on each heading: `ref={keep(group.name)}`. */
  const keep = (name: string) => (node: HTMLElement | null) => {
    headers.current[name] = node;
  };

  return { hold, keep };
}
