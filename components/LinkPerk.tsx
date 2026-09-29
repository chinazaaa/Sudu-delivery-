"use client";

import { useEffect, useState } from "react";

/**
 * "Claire sent you. ₦500 off your first delivery."
 *
 * A quiet strip rather than a modal. Somebody who has just tapped a friend's
 * link in a group chat is on their way to look at food, and a box they have
 * to close first is a toll on the one journey the whole link exists to make
 * easier. It says its piece and stays out of the way.
 *
 * Closed once, closed for the visit. Not for ever: the discount is real, it
 * applies at the checkout whether or not this is on screen, and somebody who
 * comes back tomorrow having forgotten is worth reminding.
 */
export default function LinkPerk({ who, line }: { who: string; line: string }) {
  const [shut, setShut] = useState(true);

  // Drawn only after the browser has it, so a strip nobody wants does not
  // flash up on a page that was served with it already dismissed.
  useEffect(() => {
    try {
      setShut(window.sessionStorage.getItem("sudu_perk_shut") === "yes");
    } catch {
      setShut(false);
    }
  }, []);

  if (shut) return null;

  return (
    <div className="border-b border-brand/20 bg-brand-tint/60">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <p className="min-w-0 flex-1 text-sm leading-snug text-brand-dark">
          <span className="font-bold">{who} sent you.</span>{" "}
          <span>{line}, added at the checkout.</span>
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            setShut(true);
            try {
              window.sessionStorage.setItem("sudu_perk_shut", "yes");
            } catch {
              /* A browser that will not remember still gets to close it. */
            }
          }}
          className="shrink-0 rounded-full px-2 py-1 text-lg leading-none text-brand-dark/60 hover:text-brand-dark"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
