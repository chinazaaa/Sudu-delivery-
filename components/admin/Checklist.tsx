"use client";

import { useEffect, useState } from "react";

/**
 * A private checklist, kept in this browser only. It is for working through a
 * list in a shop: what has been bought, what is in the boot. Nothing here
 * changes an order or anything a customer sees, which is exactly why it can be
 * tapped freely.
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

  const checked = done
    ? items.length
    : items.filter((item) => ticked[item.key]).length;

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
              checked === items.length && items.length > 0 ? "tick-done" : ""
            }`}
          >
            {checked === items.length && items.length > 0 ? "✓" : ""}
          </span>
          <span>
            {checked}/{items.length} {label}
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
              disabled={done}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left disabled:opacity-80 ${
                done || ticked[item.key] ? "bg-mint/5 opacity-60" : ""
              }`}
            >
              <span
                className={`tick size-[34px] font-black sm:size-7 ${done || ticked[item.key] ? "tick-done" : ""}`}
              >
                {done || ticked[item.key] ? "✓" : ""}
              </span>
              {item.lead && (
                <span className="min-w-[46px] shrink-0 font-display text-[34px] font-black leading-none sm:min-w-[48px] sm:text-[30px]">
                  {item.lead}
                </span>
              )}
              <span className={`min-w-0 ${done || ticked[item.key] ? "line-through" : ""}`}>
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
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
