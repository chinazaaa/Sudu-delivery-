"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Slot } from "@/lib/same-day";
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
  sameDayFrom,
  runFrom,
}: {
  runs: { id: string; label: string }[];
  slots: Slot[];
  sameDayFrom: number;
  runFrom: number;
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
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ordering together</h1>
        <p className="mt-1 text-sm text-muted">
          One delivery for everybody in the car, split evenly. You each order your
          own food and pay for your own.
        </p>
      </div>

      {read && group !== "" && (
        <Link
          href={`/g/${group}`}
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3"
        >
          <span>
            <span className="block font-bold text-brand-dark">You are in a group</span>
            <span className="block text-sm text-ink/75">
              See who is in it and what it is costing.
            </span>
          </span>
          <span className="shrink-0 text-sm font-extrabold text-brand-dark">Open</span>
        </Link>
      )}

      {/* Hides itself while they are in one, which is why it is not behind the
          same flag as the card above. */}
      <GroupLink
        openNow
        runs={runs}
        slots={slots}
        sameDayFrom={sameDayFrom}
        runFrom={runFrom}
      />

      <RecentGroups />

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
