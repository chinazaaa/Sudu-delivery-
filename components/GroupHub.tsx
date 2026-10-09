"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Slot } from "@/lib/same-day";
import type { ArrivalRun } from "@/lib/arrival";
import GroupLink, { PARTY_CHANGED, readGroup } from "./GroupLink";
import RecentGroups from "./RecentGroups";
import { whatsappLink } from "@/lib/settings";

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
  whatsapp = "",
}: {
  runs: ArrivalRun[];
  slots: Slot[];
  /** Today in Lagos, from the shop's clock. */
  today: string;
  /** The shop's own number, so the line at the foot of the board is a chat
   *  rather than a number somebody has to copy out. */
  whatsapp?: string;
}) {
  const [group, setGroup] = useState("");
  const [read, setRead] = useState(false);
  // What the form beside the ticket currently has chosen, so the ticket can
  // say it. The board puts the two side by side and they have to agree.
  const [chosen, setChosen] = useState("");
  const [shared, setShared] = useState(true);

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
      {/* The board's two columns, with the headline inside the left one.
          Above the grid it pushed the form down a whole screen, so a page
          whose entire job is one form opened on no form at all. */}
      <div className="grid items-start gap-10 pt-7 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col gap-6">
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

          {/* The run everybody in the car gets, on the board's ticket with
              the speed stripes behind it. It follows the form beside it,
              because two things on one screen saying different days is
              worse than neither of them saying anything. */}
          {chosen !== "" && group === "" && (
            <div className="relative max-w-[460px] pl-5 pt-5">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-[75%] w-[70%]"
                style={{
                  background:
                    "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
                }}
              />
              <div className="relative flex flex-col gap-3 rounded-2xl bg-ink p-5 text-shell shadow-[8px_8px_0_#e5321d]">
                <span className="ticket text-volt">
                  {shared ? "Shared run to PAU" : "Private car to PAU"}
                </span>
                <span className="font-display text-[clamp(1.9rem,6vw,2.5rem)] font-extrabold uppercase leading-[0.95]">
                  {chosen}
                </span>
                <div className="border-t-2 border-dashed border-[#4a423b]" />
                <div className="flex flex-wrap justify-between gap-3 text-sm">
                  <span>{shared ? "One car, one fee" : "A car of your own"}</span>
                  <span className="text-[#b9b0a5]">Same time for everyone</span>
                </div>
              </div>
            </div>
          )}

          <RecentGroups />
        </div>

        {/* Hides itself while they are in one, which is why it is not behind
            the same flag as the card above. */}
        <GroupLink
          openNow
          runs={runs}
          slots={slots}
          today={today}
          onChoice={(said, onARun) => {
            setChosen(said);
            setShared(onARun);
          }}
        />
      </div>

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

      <section className="flex flex-wrap items-center justify-between gap-4 py-2">
        <span className="text-[17px]">
          Something wrong with a group order?{" "}
          {whatsapp !== "" ? (
            <>
              WhatsApp us on{" "}
              <a
                href={
                  whatsappLink(
                    whatsapp,
                    "Hi Sudu, something is not right with ordering together.\n\nOrdering together"
                  ) ?? undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-semibold text-brand-dark underline"
              >
                {whatsapp}
              </a>
              .
            </>
          ) : (
            "Message us."
          )}
        </span>
        <Link href="/products" className="btn-quiet">
          Browse the menu first
        </Link>
      </section>
    </div>
  );
}
