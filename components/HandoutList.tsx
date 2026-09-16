"use client";

import { useEffect, useState } from "react";

export type HandoutEntry = {
  id: string;
  name: string;
  hostel: string;
  phone: string;
  items: string[];
};

/**
 * Read at the drop point, one-handed, in the dark. Ticks are kept in the
 * browser so a refresh at the gate does not lose the handout so far.
 */
export default function HandoutList({
  batchId,
  entries,
}: {
  batchId: string;
  entries: HandoutEntry[];
}) {
  const storageKey = `sudu_handout_${batchId}`;
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setTicked(JSON.parse(saved));
    } catch {
      /* Private mode or blocked storage: ticking still works, just not saved. */
    }
  }, [storageKey]);

  function toggle(id: string) {
    setTicked((current) => {
      const next = { ...current, [id]: !current[id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = entries.filter((e) => ticked[e.id]).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink/60">
        {done}/{entries.length} handed out
      </p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => toggle(entry.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left ${
                ticked[entry.id]
                  ? "border-green-600/30 bg-green-50 text-ink/50 line-through"
                  : "border-black/15 bg-white"
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{entry.name}</span>
                <span className="text-xs text-ink/50">{entry.hostel}</span>
              </span>
              <span className="mt-1 block text-sm">{entry.items.join(", ")}</span>
              <span className="text-xs text-ink/50">{entry.phone}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
