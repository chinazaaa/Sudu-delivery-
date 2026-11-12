"use client";

import { useEffect, useRef, useState } from "react";

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
  const [open, setOpen] = useState<number | null>(null);

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
            <button type="button" onClick={() => setOpen(at)} aria-label={`Open photo ${at + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Books bought from the UK, photo ${at + 1}`}
                loading={at < 2 ? "eager" : "lazy"}
                className="h-56 w-auto rounded-2xl border-2 border-ink bg-white object-cover shadow-[2px_2px_0_0_#111] sm:h-72"
              />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Viewer photos={photos} start={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/**
 * The photos full screen. Swipe sideways to move between them, tap one to
 * zoom in and drag to look around, tap again to come back out. Arrow keys
 * and Escape work on a computer.
 */
function Viewer({
  photos,
  start,
  onClose,
}: {
  photos: string[];
  start: number;
  onClose: () => void;
}) {
  const strip = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState(start);
  const [zoomed, setZoomed] = useState<number | null>(null);

  const go = (to: number, smooth = true) => {
    const el = strip.current;
    if (!el || to < 0 || to >= photos.length) return;
    setZoomed(null);
    el.scrollTo({ left: to * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  };

  // Opens on the photo that was tapped, and holds the page still behind it.
  useEffect(() => {
    go(start, false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(at + 1);
      if (event.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  return (
    <div role="dialog" aria-label="Photo" className="fixed inset-0 z-[90] bg-black/95">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 text-white">
        <span className="font-mono text-sm">
          {at + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-10 place-items-center rounded-full bg-white/15 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      <div
        ref={strip}
        onScroll={(event) => {
          const el = event.currentTarget;
          const next = Math.round(el.scrollLeft / el.clientWidth);
          if (next !== at) setAt(next);
        }}
        className={`flex h-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          zoomed !== null ? "overflow-x-hidden" : "overflow-x-auto"
        }`}
      >
        {photos.map((src, index) => (
          <div
            key={src}
            className={`h-full w-full shrink-0 snap-center ${
              zoomed === index ? "overflow-auto" : "flex items-center justify-center"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Photo ${index + 1}`}
              onClick={() => setZoomed(zoomed === index ? null : index)}
              style={{ touchAction: "pinch-zoom pan-x pan-y" }}
              className={
                zoomed === index
                  ? "max-w-none w-[220%] cursor-zoom-out"
                  : "max-h-full max-w-full cursor-zoom-in object-contain"
              }
            />
          </div>
        ))}
      </div>

      {at > 0 && (
        <button
          type="button"
          onClick={() => go(at - 1)}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white sm:grid"
        >
          ‹
        </button>
      )}
      {at < photos.length - 1 && (
        <button
          type="button"
          onClick={() => go(at + 1)}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white sm:grid"
        >
          ›
        </button>
      )}
    </div>
  );
}
