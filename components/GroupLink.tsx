"use client";

import { useEffect, useState } from "react";

const KEY = "sudu_party_v1";
const JOINED = "sudu_party_joined_v1";

/** The party this browser is ordering in, if any. */
export function readParty(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Take a party token. `viaLink` is set only when somebody arrived on
 * another person's link, never when they made one themselves.
 *
 * Recorded as a positive fact rather than inferred from a missing one. An
 * earlier version marked the person who made the link instead, so a browser
 * that had somehow lost that mark was treated as a joiner, and the one person
 * who could set the group up was the one locked out of setting it up.
 */
export function joinParty(token: string, viaLink = false): void {
  try {
    window.localStorage.setItem(KEY, token);
    if (viaLink) window.localStorage.setItem(JOINED, token);
    else window.localStorage.removeItem(JOINED);
  } catch {
    /* Without storage they simply order alone, which still works. */
  }
}

/** Whether this browser arrived on somebody else's link. */
export function joinedViaLink(): boolean {
  try {
    const token = window.localStorage.getItem(KEY);
    return Boolean(token) && window.localStorage.getItem(JOINED) === token;
  } catch {
    return false;
  }
}

export function leaveParty(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(JOINED);
  } catch {
    /* Nothing to do. */
  }
}

/**
 * One tap, and there is a link to paste in the group chat.
 *
 * The token is made here, in the browser, before anybody has typed a name or
 * picked a run. Nothing is written down anywhere until the first person in the
 * party actually orders, which is the point: asking somebody to fill in a
 * checkout before they can invite anybody is backwards.
 */
export default function GroupLink({
  small = false,
  /** Hidden once there is a group, because the bar at the top says so and
   *  sending the link again belongs there. */
  hideWhenJoined = false,
}: {
  small?: boolean;
  hideWhenJoined?: boolean;
}) {
  const [token, setToken] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(readParty());
    setJoined(joinedViaLink());
    setReady(true);
  }, []);

  const share = async () => {
    let id = token;
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
          : String(Date.now()) + Math.random().toString(36).slice(2, 10);
      joinParty(id);
      setJoined(false);
      setToken(id);
    }

    const url = `${window.location.origin}/j/${id}`;
    const text = `Ordering food to campus with Sudu. Add yours to mine and we split one delivery fee: ${url}`;

    try {
      // Only `text`, which already ends in the link. Passing `url` as well
      // makes the share sheet append it a second time, so the message arrives
      // with the link in it twice.
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* They closed the share sheet. Nothing to report. */
    }
  };

  // Rendered only once the browser has been read, so it cannot flash the
  // wrong wording on the way in.
  if (!ready) return null;
  // Nothing to offer somebody who joined: it is not their link, and the bar at
  // the top already says they are in a group.
  if (token && joined) return null;
  if (hideWhenJoined && token) return null;

  if (small) {
    return (
      <button
        type="button"
        onClick={share}
        className="chip border-brand/40 bg-brand-tint text-xs text-brand-dark"
      >
        {copied ? "Link copied" : token ? "Send the link again" : "Order together"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 text-left transition active:scale-[0.99]"
    >
      <span>
        <span className="block font-bold text-brand-dark">
          {token ? "Your group link" : "Ordering with friends?"}
        </span>
        <span className="block text-sm text-ink/75">
          {copied
            ? "Copied. Paste it in the group chat."
            : "Send them a link. Whatever they add rides in the same delivery and you split one fee."}
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold text-brand-dark">
        {token ? "Send again" : "Get link"}
      </span>
    </button>
  );
}
