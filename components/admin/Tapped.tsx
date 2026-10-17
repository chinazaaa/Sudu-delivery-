"use client";

import { useLinkStatus } from "next/link";

/**
 * The dot beside a link, which goes busy the instant it is tapped.
 *
 * A board page reads the database before it can be drawn, and on a phone on
 * mobile data that is a second or two where absolutely nothing happens. The
 * honest reading of a screen that does not change is that the tap missed,
 * so people tap again, and the second tap lands on a page that is already
 * coming.
 *
 * This asks the router instead of guessing: it is inside the Link, so it
 * knows that this particular one is loading and no other one is. Nothing is
 * promised about how long it will take, only that the tap was heard.
 */
export default function Tapped({
  on,
  tab = false,
}: {
  /** Whether this is the page already open, which decides its colours. */
  on: boolean;
  /** The bottom bar's square rather than the rail's small dot. */
  tab?: boolean;
}) {
  const { pending } = useLinkStatus();

  if (tab) {
    return (
      <span
        aria-hidden
        className={`block size-[19px] rounded-md border-2 transition ${
          pending
            ? "animate-pulse border-brand bg-brand"
            : on
              ? "border-brand bg-brand"
              : "border-muted"
        }`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`size-[7px] shrink-0 rounded-[2px] transition ${
        pending ? "animate-pulse bg-volt" : on ? "bg-white" : "bg-rail-dot"
      }`}
    />
  );
}
