"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A scroll-snap slider with dots and arrows. Built on native scrolling so it
 * stays smooth on a cheap phone and needs no library.
 */
export default function Carousel({
  children,
  auto = 6000,
}: {
  children: React.ReactNode[];
  auto?: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = children.length;

  const goTo = (next: number) => {
    const node = track.current;
    if (!node) return;
    const target = ((next % count) + count) % count;
    node.scrollTo({ left: node.clientWidth * target, behavior: "smooth" });
    setIndex(target);
  };

  useEffect(() => {
    if (count < 2 || auto === 0) return;
    const timer = setInterval(() => {
      const node = track.current;
      if (!node) return;
      const next = (Math.round(node.scrollLeft / node.clientWidth) + 1) % count;
      node.scrollTo({ left: node.clientWidth * next, behavior: "smooth" });
      setIndex(next);
    }, auto);
    return () => clearInterval(timer);
  }, [count, auto]);

  if (count === 0) return null;

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={(e) => {
          const node = e.currentTarget;
          setIndex(Math.round(node.scrollLeft / node.clientWidth));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
      >
        {children.map((child, i) => (
          <div key={i} className="w-full shrink-0 snap-center">
            {child}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg shadow-card sm:grid"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg shadow-card sm:grid"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {children.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/55"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
