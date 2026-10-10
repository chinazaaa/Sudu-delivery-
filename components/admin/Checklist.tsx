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
        <p className="text-sm text-muted">
          {checked}/{items.length} {label}
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
            className="text-xs font-semibold text-muted hover:text-brand"
          >
            Clear ticks
          </button>
        )}
      </div>

      <ul className="divide-y-[1.5px] divide-[#ece7df] border-t-[1.5px] border-[#ece7df]">
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
                className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 text-[15px] font-black ${
                  done || ticked[item.key]
                    ? "border-mint bg-mint text-white"
                    : "border-ink bg-paper"
                }`}
              >
                {done || ticked[item.key] ? "✓" : ""}
              </span>
              {item.lead && (
                <span className="min-w-[48px] shrink-0 font-display text-[30px] font-black leading-none">
                  {item.lead}
                </span>
              )}
              <span className={`min-w-0 ${done || ticked[item.key] ? "line-through" : ""}`}>
                <span className="block text-[15.5px] font-semibold">{item.text}</span>
                {item.detail && (
                  <span className="block text-[12.5px] text-muted">{item.detail}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
