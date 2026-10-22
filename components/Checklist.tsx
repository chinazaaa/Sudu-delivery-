"use client";

import { useEffect, useState } from "react";

/**
 * A private checklist, kept in this browser only. It is for working through a
 * list in a shop: what has been bought, what is in the boot. Nothing here
 * changes an order or anything a customer sees, which is exactly why it can be
 * tapped freely.
 *
 * The one kind of ticking that pays the person doing it. Everything else a
 * run asks to be ticked is the shop wanting to know something; this is six
 * lines at a counter and no way to hold which three have come over it yet.
 * It costs a tap and nothing waits on it, so it lives out here rather than
 * under admin: the person at the counter is often not the person with the
 * password.
 */
export default function Checklist({
  id,
  items,
  label,
  done = false,
}: {
  /** Anything unique to this list, so two lists never share their ticks. */
  id: string;
  items: {
    key: string;
    text: string;
    detail?: string;
    /**
     * The each-price, kept apart from the rest of the detail because the
     * boards set it in the mono face. Money is always mono, and the figure
     * you argue with at the till is the one that has to be unmistakable.
     */
    money?: string;
    /**
     * The count, set apart from the name. At a counter the number is what
     * gets said out loud and the name only confirms it, so it is read first
     * and in the display face rather than buried in front of the words.
     */
    lead?: string;
    /**
     * Somebody at the counter said this one could not be had.
     *
     * It outranks every other way a line can look ticked, including the
     * whole list being marked done. The per line ticks live in the browser
     * of whoever is standing at the till, so the shop's own copy of this
     * sheet cannot see them and shows a finished stop as all bought. That
     * is right for four lines out of five and badly wrong for the fifth:
     * the sold out chicken pie read as collected, struck through, on the
     * page the refund is supposed to be worked out from.
     *
     * This is the one part of it the server does know, because writing the
     * note is a thing the driver did to the run rather than to her phone.
     */
    short?: boolean;
    /** What was written at the counter about it, where anything was. */
    shortSaid?: string;
  }[];
  label: string;
  /** The work this list was for is over: show it settled, not half-ticked. */
  done?: boolean;
}) {
  const storageKey = `sudu_check_${id}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTicked(JSON.parse(saved));
    } catch {
      /* Private mode: ticking still works, it is just forgotten on reload. */
    }
  }, [storageKey]);

  function toggle(key: string) {
    setTicked((current) => {
      const next = { ...current, [key]: !current[key] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  // A line nobody could buy is never bought, however the list is marked.
  const had = (item: { key: string; short?: boolean }) =>
    item.short !== true && (done || ticked[item.key] === true);

  const checked = items.filter(had).length;
  const shortOf = items.filter((item) => item.short === true).length;
  // Out of what could actually be got, so a stop where everything
  // available was collected reads as finished rather than stuck at 4/5.
  const gettable = items.length - shortOf;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2.5 text-sm text-muted">
          {/* The whole stop, at a glance. Not a control: ticking every line
              is what fills it, because a stop is done when the things in it
              are, and a second way to say so would let the two disagree. */}
          <span
            aria-hidden
            className={`tick size-[34px] rounded-full text-[17px] font-black ${
              checked === gettable && gettable > 0 ? "tick-done" : ""
            }`}
          >
            {checked === gettable && gettable > 0 ? "✓" : ""}
          </span>
          <span>
            {checked}/{gettable} {label}
            {shortOf > 0 && (
              <span className="text-brand-dark">
                {" "}
                · {shortOf} not available
              </span>
            )}
          </span>
        </p>
        {checked > 0 && !done && (
          <button
            type="button"
            onClick={() => {
              setTicked({});
              try {
                window.localStorage.removeItem(storageKey);
              } catch {
                /* ignore */
              }
            }}
            className="btn-admin btn-admin-sm"
          >
            Clear ticks
          </button>
        )}
      </div>

      <ul className="divide-y-[1.5px] divide-rule border-t-[1.5px] border-rule">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              disabled={done || item.short === true}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left disabled:opacity-80 ${
                item.short === true
                  ? "bg-brand-wash"
                  : had(item)
                    ? "bg-mint/5 opacity-60"
                    : ""
              }`}
            >
              <span
                className={`tick size-[34px] font-black sm:size-7 ${had(item) ? "tick-done" : ""}`}
              >
                {had(item) ? "✓" : item.short === true ? "—" : ""}
              </span>
              {item.lead && (
                <span className="min-w-[46px] shrink-0 font-display text-[34px] font-black leading-none sm:min-w-[48px] sm:text-[30px]">
                  {item.lead}
                </span>
              )}
              <span className={`min-w-0 ${had(item) ? "line-through" : ""}`}>
                <span className="block text-[15px] font-semibold leading-[1.25] sm:text-[15.5px]">
                  {item.text}
                </span>
                {(item.detail || item.money) && (
                  <span className="block text-[12.5px] text-muted">
                    {item.detail}
                    {item.detail && item.money ? " · " : ""}
                    {item.money && <span className="font-mono">{item.money}</span>}
                  </span>
                )}
                {/*
                  Why it is not ticked, on the line it is about. The panel
                  at the top of the run says the same thing, and somebody
                  reading down a counter looking for the gap should not
                  have to scroll back up to find out what the gap was.
                */}
                {item.short === true && (
                  <span className="mt-0.5 block text-[12.5px] font-semibold text-brand-dark">
                    Not available
                    {String(item.shortSaid ?? "").trim() !== ""
                      ? ` · ${item.shortSaid}`
                      : ""}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
