"use client";

import Link from "next/link";
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
  href = "",
  offer,
  go = "",
}: {
  text: string;
  /** Where the words take somebody. Empty leaves them as plain text, which
   *  is right for a claim: "since 2018" is not a door. */
  href?: string;
  offer: { code: string; line: string; automatic?: boolean } | null;
  /** Where an automatic offer's words take somebody. Empty leaves them as
   *  plain text, which is right for a code nobody can tap towards. */
  go?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!text && !offer) return null;

  return (
    <div className="bg-ink px-4 py-2 text-center text-white">
      <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm">
        {/* A thing people can order is announced with a way to order it.
            Underlined, because white on black with no underline is a
            sentence rather than a link, and nobody taps a sentence. */}
        {text && href !== "" && (
          <Link href={href} className="font-semibold text-volt underline underline-offset-2">
            {text}
          </Link>
        )}
        {text && href === "" && <span className="font-semibold">{text}</span>}

        {/* The dot only earns its place when both halves are on one line. */}
        {text && offer && (
          <span aria-hidden className="hidden text-white/30 sm:inline">
            ·
          </span>
        )}

        {/* An automatic offer is simply true of the cart, so there is
            nothing to type and nothing to explain: the line is the whole
            announcement, and it is a door where there is somewhere to
            send people. */}
        {offer?.automatic && go !== "" && (
          <Link href={go!} className="font-semibold text-volt underline underline-offset-2">
            {offer.line}
          </Link>
        )}
        {offer?.automatic && go === "" && (
          <span className="text-white/80">{offer.line}</span>
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
