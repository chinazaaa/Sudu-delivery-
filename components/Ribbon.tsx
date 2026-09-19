"use client";

import { useState } from "react";

/**
 * One line along the top of every page.
 *
 * It holds whatever is true today: a claim, a return, an offer. One line and
 * small, because a shop that shouts at you above every page is a shop you
 * scroll past. It goes away entirely when there is nothing to say.
 *
 * Both halves are written in admin, and the offer half reads the code itself,
 * so it cannot go on promising something the code no longer does.
 */
export default function Ribbon({
  text,
  offer,
}: {
  text: string;
  offer: { code: string; line: string; automatic?: boolean } | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!text && !offer) return null;

  return (
    <div className="bg-ink px-4 py-2 text-center text-white">
      <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm">
        {text && <span className="font-semibold">{text}</span>}

        {/* The dot only earns its place when both halves are on one line. */}
        {text && offer && (
          <span aria-hidden className="hidden text-white/30 sm:inline">
            ·
          </span>
        )}

        {/* A promotion has no code to type, so there is nothing to copy and
            saying "with" would send people looking for a box. It is simply
            true of the cart, and saying so is the whole announcement. */}
        {offer?.automatic && (
          <span className="flex items-center gap-1.5">
            <span className="text-white/80">{offer.line}</span>
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-extrabold tracking-wide">
              No code needed
            </span>
          </span>
        )}

        {offer && !offer.automatic && (
          <span className="flex items-center gap-1.5">
            <span className="text-white/80">{offer.line} with</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(offer.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* Clipboard blocked. The code is on screen to read. */
                }
              }}
              className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-extrabold tracking-wide"
            >
              {copied ? "Copied" : offer.code}
            </button>
          </span>
        )}
      </p>
    </div>
  );
}
