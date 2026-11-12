"use client";

import { useEffect, useRef } from "react";

/**
 * A strip of photos of books people have bought from the UK, sliding by
 * itself and swipeable. Each photo keeps its own shape rather than being
 * cropped to one: half of them are a stack of spines and half are covers.
 *
 * It moves on its own every few seconds and stops the moment somebody
 * touches it, or for anybody who has asked their phone for less movement.
 */
export default function BookSlider({ photos }: { photos: string[] }) {
  const strip = useRef<HTMLUListElement | null>(null);
  const touched = useRef(false);

  useEffect(() => {
    if (photos.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = setInterval(() => {
      const el = strip.current;
      if (!el || touched.current) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else {
        const next = Array.from(el.children).find(
          (child) => (child as HTMLElement).offsetLeft > el.scrollLeft + 8
        ) as HTMLElement | undefined;
        el.scrollTo({ left: next ? next.offsetLeft - 16 : 0, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [photos.length]);

  if (photos.length === 0) return null;

  return (
    <section aria-label="Books people have bought" className="space-y-2">
      <h2 className="font-display text-2xl font-black uppercase leading-none">
        Books people have bought
      </h2>
      <ul
        ref={strip}
        onTouchStart={() => {
          touched.current = true;
        }}
        onMouseDown={() => {
          touched.current = true;
        }}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((src, at) => (
          <li key={src} className="shrink-0 snap-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Books bought from the UK, photo ${at + 1}`}
              loading={at < 2 ? "eager" : "lazy"}
              className="h-56 w-auto rounded-2xl border-2 border-ink bg-white object-cover shadow-[2px_2px_0_0_#111] sm:h-72"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
