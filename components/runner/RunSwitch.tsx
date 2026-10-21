"use client";

import { useState } from "react";

/**
 * The stops, switched without going back to the server.
 *
 * Each stop used to be its own address, which is tidy and was unusable:
 * the page is dynamic, so every tap on a number re-ran the whole run sheet
 * against the database before anything moved. Ten seconds, standing at a
 * counter, to see what the next one wanted.
 *
 * So the server builds every stop once and this shows one of them. A tap
 * is a state change and nothing else.
 *
 * Hidden rather than unmounted, which is the whole reason this takes
 * rendered children instead of switching on an index and rebuilding. A
 * stop that unmounts loses what is typed into its price boxes, and
 * somebody who glances at the next stop while waiting for a receipt
 * should not come back to an empty form.
 */
export default function RunSwitch({
  stops,
  children,
}: {
  stops: {
    /** What the pill says: a stop number, or a word for the last one. */
    short: string;
    /** What it is called in a sentence, for the button at the bottom. */
    name: string;
    /** Wider pill, for the one that is not a numbered stop. */
    wide?: boolean;
    /** Collected already, so the pill reads as done. */
    got?: boolean;
  }[];
  children: React.ReactNode[];
}) {
  /*
   * Opens on the first stop not yet collected, or the last screen when
   * they all are. Somebody coming back to this page mid-run has not
   * changed what they are doing, and starting at stop one every time is
   * the page making them find their place again at every red light.
   */
  const [at, setAt] = useState(() => {
    const left = stops.findIndex((stop) => !stop.wide && !stop.got);
    return left === -1 ? Math.max(0, stops.length - 1) : left;
  });

  return (
    <>
      <nav className="flex flex-wrap items-center gap-1.5">
        {stops.map((stop, index) => {
          const here = at === index;
          return (
            <button
              key={stop.short}
              type="button"
              onClick={() => setAt(index)}
              aria-current={here ? "step" : undefined}
              className={`flex h-11 items-center justify-center rounded-full border-2 font-display font-black ${
                stop.wide ? "px-4 text-[15px] uppercase" : "w-11 text-[17px]"
              } ${
                here
                  ? "border-ink bg-ink text-paper"
                  : stop.got
                    ? "border-mint bg-mint/15 text-mint"
                    : "border-line bg-paper"
              }`}
            >
              {stop.got && !here && !stop.wide ? "✓" : stop.short}
            </button>
          );
        })}
      </nav>

      {children.map((child, index) => (
        <div key={index} className={at === index ? "space-y-4" : "hidden"}>
          {child}
        </div>
      ))}

      {/*
        On to the next one, at the bottom where the thumb is after typing a
        receipt. A button rather than a link for the same reason as the
        pills: it has to be instant.
      */}
      {at < children.length - 1 && (
        <button
          type="button"
          onClick={() => {
            setAt(at + 1);
            window.scrollTo({ top: 0 });
          }}
          className="btn-quiet w-full justify-center py-3.5 text-base"
        >
          {stops[at + 1]?.wide
            ? `On to ${stops[at + 1]?.name ?? "the drops"} →`
            : `Next stop: ${stops[at + 1]?.name ?? ""} →`}
        </button>
      )}
    </>
  );
}
