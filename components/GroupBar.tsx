"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { leaveParty, PARTY_CHANGED, readParty } from "./GroupLink";

type Party = {
  started: boolean;
  id?: string;
  leader?: string;
  people?: number;
  names?: string[];
  closed?: boolean;
  when?: string;
};

/**
 * "You are in Nasa's group", on every page.
 *
 * Joining a link used to change nothing: the site looked exactly as it does to
 * somebody ordering alone, so it did not feel like a group at all. This is the
 * one thing that makes it feel like one, which is why it sits above everything
 * rather than inside a page somebody may never open.
 */
export default function GroupBar() {
  const [token, setToken] = useState("");
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    // Re-read whenever a party starts or ends, because somebody can make a
    // link from the page they are already standing on.
    const reread = () => setToken(readParty());
    window.addEventListener(PARTY_CHANGED, reread);

    const found = readParty();
    setToken(found);
    if (!found) return () => window.removeEventListener(PARTY_CHANGED, reread);

    let alive = true;
    const look = () =>
      fetch(`/api/party/${found}`)
        .then((response) => response.json())
        .then((data: Party) => {
          if (!alive) return;
          setParty(data);
          // Once it has been closed and priced, the party is over and the bar
          // would only be in the way.
          if (data.closed) {
            leaveParty();
            setToken("");
          }
        })
        .catch(() => {
          /* Offline is not a reason to hide the bar. */
        });

    look();
    const timer = setInterval(look, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener(PARTY_CHANGED, reread);
    };
  }, [token]);

  if (!token) return null;

  const others = (party?.people ?? 0) - 1;

  return (
    <div className="bg-brand text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-extrabold">
            {party?.started && party.leader
              ? `In ${party.leader}'s group`
              : "Ordering with your group"}
          </span>
          <span className="block truncate text-white/85">
            {party?.started
              ? [
                  party.names?.join(", "),
                  party.when ? `arriving ${party.when}` : "",
                  others > 0 ? "one delivery between you" : "",
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Add your food. You pay for your own, and the delivery is split evenly."}
          </span>
        </span>

        {party?.started && party.id ? (
          <Link
            href={`/g/${party.id}`}
            className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold"
          >
            See group
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => {
            leaveParty();
            setToken("");
          }}
          className="shrink-0 text-xs font-semibold text-white/80 underline"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
