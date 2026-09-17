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
  items: { key: string; text: string; detail?: string }[];
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

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => toggle(item.key)}
              disabled={done}
              className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left disabled:opacity-80 ${
                done || ticked[item.key]
                  ? "border-mint/30 bg-mint/5 text-muted"
                  : "border-black/10 bg-white"
              }`}
            >
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border text-xs font-black ${
                  done || ticked[item.key]
                    ? "border-mint bg-mint text-white"
                    : "border-black/20"
                }`}
              >
                {done || ticked[item.key] ? "✓" : ""}
              </span>
              <span className={done || ticked[item.key] ? "line-through" : ""}>
                <span className="block font-semibold">{item.text}</span>
                {item.detail && (
                  <span className="block text-sm text-muted">{item.detail}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
