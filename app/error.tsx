"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Whether this is the connection rather than the shop.
 *
 * A browser that cannot reach the server throws a plain TypeError whose
 * message is whatever that browser calls it: Safari says "Load failed",
 * Chrome "Failed to fetch", Firefox "NetworkError when attempting to fetch
 * resource". None of them says anything a customer can act on, and all of
 * them mean the same thing, which is: try again when you have signal.
 */
const OFFLINE = [
  "load failed",
  "failed to fetch",
  "networkerror",
  "network request failed",
  "the network connection was lost",
  "the internet connection appears to be offline",
  "cancelled",
  "aborted",
];

function isConnection(message: string): boolean {
  const said = message.toLowerCase();
  return OFFLINE.some((phrase) => said.includes(phrase));
}

/**
 * When something on the page throws.
 *
 * Next shows its own screen otherwise, which reads as the site being down. A
 * failed save is usually one thing not working rather than everything, so this
 * says what happened and offers to try again.
 *
 * A dropped connection gets its own words. Somebody came back to their own
 * paid order on a phone that had been asleep, the page refreshed itself, the
 * refresh could not reach us, and they were shown "That did not go through.
 * Nothing was changed" over the words "Load failed". Nothing of theirs had
 * gone wrong at all: the order was placed, paid and on the run. On an order
 * page that wording is frightening and it is not even true, so a connection
 * failure now says it is the connection, says the order is safe, and tries
 * again by itself the moment the phone has signal.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const offline = isConnection(error.message ?? "");

  // Back on the network, back to the page, without anybody pressing
  // anything. Pocketed phones come back online on their own.
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!offline) return;
    const back = () => {
      setWaiting(true);
      reset();
    };
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [offline, reset]);

  return (
    <div className="card mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-10 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-amber-100 text-3xl text-amber-900">
        !
      </span>

      <h1 className="text-xl font-extrabold">
        {offline ? "Could not reach Sudu" : "That did not go through"}
      </h1>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        {offline ? (
          <>
            Your phone lost the connection for a moment. Nothing of yours has
            changed, and any order you have placed is safe. This page comes
            back on its own as soon as you have signal.
          </>
        ) : (
          <>
            Nothing was changed. Try it again, and if it keeps happening the
            message below says why.
          </>
        )}
      </p>

      {/* The exact words a browser used for a dropped connection help nobody,
          and on an order page they read as the order having failed. The
          reference stays, because that is what matches this screen to the
          line in the host's log. */}
      {((!offline && error.message) || error.digest) && (
        <p className="mt-3 w-full break-words rounded-xl bg-black/[0.04] px-3 py-2 text-left text-xs text-ink/80">
          {offline ? null : error.message}
          {error.digest && (
            <span className="mt-1 block font-mono text-[11px] text-muted">
              Reference {error.digest}
            </span>
          )}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary px-6">
          {waiting ? "Trying again" : "Try again"}
        </button>
        <Link href="/orders" className="btn-quiet px-6">
          My orders
        </Link>
        <Link href="/" className="btn-quiet px-6">
          Back to the menu
        </Link>
      </div>
    </div>
  );
}
