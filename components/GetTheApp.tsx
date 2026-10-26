"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The app, offered on the one page where it is actually worth something.
 *
 * The floating card that mentions the app is kept off order pages on
 * purpose: somebody watching their dinner does not want an advert over it.
 * But this is the page they come back to, refreshing, to find out where the
 * food has got to, and that refreshing is exactly what the app would save
 * them. So it is offered here as the answer to the thing they are doing,
 * rather than as a card in the corner of something else.
 *
 * Only while there is still something to be told. Once the food is handed
 * over there is nothing left to notify, and "get the app" under a delivered
 * order is an advert with no argument in it.
 *
 * The three things it says are the three the shop really sends: see
 * lib/push.ts and the stage buttons in admin. Nothing is promised here that
 * a phone would not actually get.
 */
const HIDDEN = "sudu-app-asked";

export default function GetTheApp({
  /** Empty where the shop has no app to mention, which keeps this silent. */
  appId = "",
  androidPackage = "",
}: {
  appId?: string;
  androidPackage?: string;
}) {
  const [gone, setGone] = useState(true);

  // Decided after mount, so a dismissal is never flashed up before it is
  // read back. Storage can throw in a private window, and a card nobody
  // can hide is better than a page that will not draw.
  useEffect(() => {
    try {
      setGone(window.localStorage.getItem(HIDDEN) === "1");
    } catch {
      setGone(false);
    }
  }, []);

  if (gone) return null;
  if (appId === "" && androidPackage === "") return null;

  const hide = () => {
    setGone(true);
    try {
      window.localStorage.setItem(HIDDEN, "1");
    } catch {
      /* Hidden for this page either way, which is what the tap asked for. */
    }
  };

  return (
    <section className="card flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[19px] font-black uppercase leading-tight">
          Stop refreshing this page
        </h2>
        <p className="mt-1 text-sm text-ink/75">
          The app buzzes your phone when your food leaves the restaurants, and
          again when we are at your block. Same orders, same account.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/app"
          className="rounded-full bg-brand px-3.5 py-2 text-sm font-extrabold text-white"
        >
          Get the app
        </Link>
        <button
          type="button"
          onClick={hide}
          className="px-1 text-sm font-semibold text-muted underline"
        >
          No thanks
        </button>
      </div>
    </section>
  );
}
