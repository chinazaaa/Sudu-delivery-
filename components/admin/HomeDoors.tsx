"use client";

import { useState } from "react";

import {
  DOOR_LABEL,
  DOOR_NOTE,
  readDoors,
  writeDoors,
  type DoorRow,
} from "@/lib/home-doors";

/**
 * The order of the front page, moved by hand.
 *
 * One list, up and down, and a switch each. Saved as one line, so a door
 * switched off keeps its place and comes back where it was rather than at the
 * bottom. Nothing is deleted: next week you may be promoting parcels, and the
 * week after that you may not.
 */
export default function HomeDoors({
  saved,
  children,
}: {
  saved: string;
  /** The save button, passed in so this stays a list and not a form. */
  children: React.ReactNode;
}) {
  const [rows, setRows] = useState<DoorRow[]>(() => readDoors(saved));

  const move = (at: number, by: number) => {
    const to = at + by;
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[at], next[to]] = [next[to], next[at]];
    setRows(next);
  };

  const toggle = (at: number) =>
    setRows(rows.map((one, index) => (index === at ? { ...one, on: !one.on } : one)));

  return (
    <div className="space-y-3">
      <input type="hidden" name="home_order" value={writeDoors(rows)} />

      <ol className="space-y-2">
        {rows.map((row, at) => (
          <li
            key={row.key}
            className={`flex items-start gap-3 rounded-xl border border-black/10 p-3 ${
              row.on ? "" : "bg-black/[0.03]"
            }`}
          >
            <span className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => move(at, -1)}
                disabled={at === 0}
                aria-label={`Move ${DOOR_LABEL[row.key]} up`}
                className="grid size-7 place-items-center rounded-lg bg-black/5 text-sm font-bold disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(at, 1)}
                disabled={at === rows.length - 1}
                aria-label={`Move ${DOOR_LABEL[row.key]} down`}
                className="grid size-7 place-items-center rounded-lg bg-black/5 text-sm font-bold disabled:opacity-30"
              >
                ↓
              </button>
            </span>

            <span className="min-w-0 flex-1">
              <span className={`block font-bold ${row.on ? "" : "text-muted"}`}>
                {at + 1}. {DOOR_LABEL[row.key]}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {DOOR_NOTE[row.key]}
              </span>
            </span>

            <button
              type="button"
              onClick={() => toggle(at)}
              className={`chip shrink-0 border-transparent text-xs font-bold ${
                row.on ? "bg-mint/20" : "bg-black/5 text-muted"
              }`}
            >
              {row.on ? "on" : "hidden"}
            </button>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted">
        A card only shows when there is something behind it, whatever the order
        says: no parcel route priced, no parcel card.
      </p>

      {children}
    </div>
  );
}
