"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Slot } from "@/lib/same-day";
import type { ArrivalRun } from "@/lib/arrival";
import GroupLink, { PARTY_CHANGED, readGroup } from "./GroupLink";
import RecentGroups from "./RecentGroups";

/**
 * The Group tab: the car you are in, the way to start one, and the ones you
 * have been in before.
 *
 * Which group this browser is in lives in the browser, so the page around it
 * is a server page and this is the part that knows.
 */
export default function GroupHub({
  runs,
  slots,
  today,
}: {
  runs: ArrivalRun[];
  slots: Slot[];
  /** Today in Lagos, from the shop's clock. */
  today: string;
}) {
  const [group, setGroup] = useState("");
  const [read, setRead] = useState(false);

  useEffect(() => {
    const look = () => {
      setGroup(readGroup());
      setRead(true);
    };
    look();
    window.addEventListener(PARTY_CHANGED, look);
    return () => window.removeEventListener(PARTY_CHANGED, look);
  }, []);

  return (
    <div className="-mt-4 space-y-5">
      {/* The board's head. "Start a group" is the thing to do here, so that
          is what the page is called, as big as it will go. */}
      <header className="flex flex-col gap-4 pt-7">
        <span className="ticket text-brand-dark">
          Group order · one car · one fee
        </span>
        <h1 className="font-display text-[min(19vw,8.75rem)] font-black uppercase leading-[0.84] sm:text-[clamp(4rem,10vw,8.75rem)]">
          Start a
          <br />
          <span className="text-brand">group</span>
        </h1>
        <p className="max-w-[480px] text-[17px] leading-relaxed text-ink/80 sm:text-lg">
          Everyone adds their own food from any kitchen, it all comes in one
          car, and you split one delivery fee.
        </p>
      </header>

      {read && group !== "" && (
        <Link
          href={`/g/${group}`}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-ink px-5 py-4 text-shell shadow-[5px_5px_0_#e5321d]"
        >
          <span>
            <span className="ticket block text-volt">You are in a group</span>
            <span className="mt-1 block font-display text-[28px] font-extrabold uppercase leading-none">
              Open your car
            </span>
            <span className="mt-1 block text-sm text-[#d8d1c7]">
              See who is in it and what it is costing.
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-xl font-bold text-volt">
            →
          </span>
        </Link>
      )}

      {/* Hides itself while they are in one, which is why it is not behind the
          same flag as the card above. */}
      <GroupLink
        openNow
        runs={runs}
        slots={slots}
        today={today}
      />

      <RecentGroups />

      {/* How it works, the board's four numbered steps on Ink. The whole
          thing turns on strangers believing that one car really is one fee,
          and a page that only offers a button never says why. */}
      <section className="bleed bg-ink text-shell">
        <div className="shell flex flex-col gap-8 py-12 sm:py-16">
          <h2 className="section-title">How a group run works</h2>
          <ol className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Start it",
                "Put your first name in and pick when it should arrive.",
              ],
              [
                "Share the link",
                "Friends open it and add their own food, from any kitchen.",
              ],
              [
                "One car, one fee",
                "Everything rides together, so the delivery fee is split between you.",
              ],
              [
                "Same time for all",
                "Everybody who joins gets the same delivery window and a call at the block.",
              ],
            ].map(([said, note], at) => (
              <li
                key={said}
                className="flex flex-col gap-2.5 border-t-4 border-brand pt-4"
              >
                <span className="font-display text-[64px] font-black leading-[0.8] text-brand">
                  {String(at + 1).padStart(2, "0")}
                </span>
                <span className="text-lg font-bold">{said}</span>
                <span className="leading-relaxed text-[#d8d1c7]">{note}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <p className="text-sm text-muted">
        Not ordering with anybody?{" "}
        <Link href="/" className="font-semibold text-brand">
          Order on your own
        </Link>
        .
      </p>
    </div>
  );
}
