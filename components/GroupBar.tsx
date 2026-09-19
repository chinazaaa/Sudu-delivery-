"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { joinedViaLink, leaveGroup, PARTY_CHANGED, readGroup } from "./GroupLink";
import Sheet from "./Sheet";

type Party = {
  started: boolean;
  id?: string;
  leader?: string;
  people?: number;
  names?: string[];
  closed?: boolean;
  ready?: number;
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
  // Standing on the group page already, "See group" points at where you are.
  // The bar still earns its place there: it is what says you are in one, and
  // Leave is the way out.
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [party, setParty] = useState<Party | null>(null);
  // Whose group it is reads differently depending on which of them is looking,
  // and getting that wrong is what made the leader think they were a guest.
  const [joined, setJoined] = useState(false);
  // Leaving takes their food out of the car, so it is asked rather than done
  // by a mistap on a bar that sits on every page.
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    // Re-read whenever a party starts or ends, because somebody can make a
    // link from the page they are already standing on.
    const reread = () => {
      setToken(readGroup());
      setJoined(joinedViaLink());
    };
    window.addEventListener(PARTY_CHANGED, reread);

    const found = readGroup();
    setToken(found);
    setJoined(joinedViaLink());
    if (!found) return () => window.removeEventListener(PARTY_CHANGED, reread);

    let alive = true;
    const look = () =>
      fetch(`/api/party/${found}`)
        .then((response) => response.json())
        .then((data: Party) => {
          if (!alive) return;
          setParty(data);
          // Once it has been closed and priced, the party is over and the bar
          // would only be in the way. A group that is no longer there is the
          // same: better to say nothing than to say something untrue.
          if (data.closed || !data.started) {
            leaveGroup();
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
    <>
      {asking && (
        <Sheet title="Leave this group?" onClose={() => setAsking(false)}>
            <p className="text-sm text-muted">
              Your food comes out of the car and the others stop paying a share for
              you. Your cart stays on this phone, so you can order on your own or
              open the link again.
            </p>
            <button
              type="button"
              onClick={() => {
                leaveGroup();
                setToken("");
                setAsking(false);
                // Standing on the board of the group you just left is a page
                // about something you are no longer in, and it asks you to
                // join it again. Somewhere you can still order is better.
                if (pathname.startsWith("/g/")) router.push("/");
              }}
              className="btn-primary w-full"
            >
              Yes, leave
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="w-full text-sm font-semibold text-muted"
            >
              Stay in
            </button>
        </Sheet>
      )}

    <div className="bg-brand text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-extrabold">
            {joined && party?.leader ? `In ${party.leader}'s group` : "Your group"}
          </span>
          <span className="block truncate text-white/85">
            {[
              party?.names && party.names.length > 0
                ? party.names.join(", ")
                : "Nobody has joined yet",
              party && (party.people ?? 0) > 0
                ? `${party.ready ?? 0} of ${party.people} ready`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>

        {pathname !== `/g/${token}` && (
          <Link
            href={`/g/${token}`}
            className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-bold"
          >
            See group
          </Link>
        )}

        <button
          type="button"
          onClick={() => setAsking(true)}
          className="shrink-0 text-xs font-semibold text-white/80 underline"
        >
          Leave
        </button>
      </div>
    </div>
    </>
  );
}
