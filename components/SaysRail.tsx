"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Stars from "./Stars";
import type { GoogleQuote } from "@/lib/settings";

/**
 * The reviews, as one row that scrolls sideways.
 *
 * They were a grid, which was right at three and wrong at nine: three rows
 * of cards on a yellow band pushes everything under it off the screen, and
 * the band stops being a thing you glance at on the way past. A rail stays
 * one row however many there are, and nobody's words have to be cut to keep
 * it that way.
 *
 * The scrolling itself is the browser's, with snap points, so a phone swipes
 * it without a line of JavaScript. The arrows are for a desk, where there is
 * no swipe, and they appear only when there is something off the edge to
 * reach: an arrow that does nothing is worse than no arrow.
 */
export default function SaysRail({ quotes }: { quotes: GoogleQuote[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoOn, setCanGoOn] = useState(false);

  const look = useCallback(() => {
    const now = rail.current;
    if (!now) return;
    // A pixel of slack: browsers land a scroll a fraction short of the end
    // and the arrow would stay lit with nothing left to show.
    setCanGoBack(now.scrollLeft > 1);
    setCanGoOn(now.scrollLeft + now.clientWidth < now.scrollWidth - 1);
  }, []);

  useEffect(() => {
    look();
    const now = rail.current;
    if (!now) return;
    // Resizing changes what fits, and so changes whether the arrows mean
    // anything.
    const watch = new ResizeObserver(look);
    watch.observe(now);
    return () => watch.disconnect();
  }, [look, quotes.length]);

  const nudge = (way: 1 | -1) => {
    const now = rail.current;
    if (!now) return;
    // A card and its gap, near enough: whatever is under the left edge
    // after this is a whole card rather than half of one.
    const card = now.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 12 : now.clientWidth * 0.8;
    now.scrollBy({ left: step * way, behavior: "smooth" });
  };

  if (quotes.length === 0) return null;

  return (
    <div className="relative">
      <ul
        ref={rail}
        onScroll={look}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
      >
        {quotes.map((one, at) => (
          <li
            key={`${at}-${one.said}`}
            className="flex w-[80%] shrink-0 snap-start flex-col gap-3 rounded-2xl border-2 border-ink bg-paper p-5 sm:w-[46%] lg:w-[31.5%]"
          >
            {/* Their stars, not five by default: the shop has fours on its
                profile and showing them as fives would be writing a review
                nobody left. */}
            <Stars out={one.stars} />
            <blockquote className="text-[17px] leading-relaxed">
              &ldquo;{one.said}&rdquo;
            </blockquote>
            {one.who !== "" && (
              <span className="ticket mt-auto text-muted">{one.who}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Over the rail rather than under it, so the row keeps its height
          whether or not there is anywhere to go. Off on a phone, which
          swipes. */}
      {(canGoBack || canGoOn) && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between sm:flex">
          <Arrow way="back" on={canGoBack} press={() => nudge(-1)} />
          <Arrow way="on" on={canGoOn} press={() => nudge(1)} />
        </div>
      )}
    </div>
  );
}

function Arrow({
  way,
  on,
  press,
}: {
  way: "back" | "on";
  on: boolean;
  press: () => void;
}) {
  return (
    <button
      type="button"
      onClick={press}
      disabled={!on}
      aria-label={way === "back" ? "Earlier reviews" : "More reviews"}
      className={`pointer-events-auto grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-paper text-xl font-black shadow-[3px_3px_0_#15110e] transition ${
        way === "back" ? "-translate-x-1/2" : "translate-x-1/2"
      } ${on ? "hover:bg-volt" : "invisible"}`}
    >
      <span aria-hidden>{way === "back" ? "←" : "→"}</span>
    </button>
  );
}
