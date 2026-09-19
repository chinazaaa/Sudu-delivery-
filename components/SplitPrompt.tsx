"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PARTY_CHANGED, readGroup } from "./GroupLink";

/**
 * One line, at the top, for the thing that makes Sudu cheaper than ordering
 * alone.
 *
 * The group feature was invisible until somebody reached their cart, which is
 * after they have decided how they are ordering. It belongs where the decision
 * is still open, and it has to earn its line: so it is a line, not a card, and
 * it goes when they are already in a group, because then it is telling them
 * something they are in the middle of doing.
 */
export default function SplitPrompt() {
  const [inGroup, setInGroup] = useState(true);

  useEffect(() => {
    const read = () => setInGroup(readGroup() !== "");
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  if (inGroup) return null;

  return (
    <Link
      href="/cart"
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand-tint px-4 py-2.5"
    >
      <span className="min-w-0 text-sm">
        <span className="font-bold text-brand-dark">Ordering with friends?</span>{" "}
        <span className="text-ink/75">
          Split one delivery between all of you.
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold text-brand-dark">Start</span>
    </Link>
  );
}
