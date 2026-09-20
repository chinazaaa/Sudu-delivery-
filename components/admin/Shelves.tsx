"use client";

import { useState } from "react";
import { deleteEmptyShelves } from "@/app/admin/actions";

type Shelf = { id: string; name: string; items: number; filed: number };

/**
 * Every shelf, emptiest first, and a way to be rid of the ones holding
 * nothing.
 *
 * An import makes a shelf for every collection the file names, so a catalogue
 * that has moved on leaves a row of shelves with nothing on them. They are
 * not dangerous, they are just in the way of the ones people use, and the
 * only honest way to decide is to see the counts.
 *
 * Ticked rather than deleted on sight: a shelf that is empty this morning may
 * be the one a delivery fills this afternoon, and that is a judgement only
 * the person running the shop can make.
 */
export default function Shelves({ shelves }: { shelves: Shelf[] }) {
  const empty = shelves.filter((one) => one.items === 0 && one.filed === 0);
  const [ticked, setTicked] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  if (shelves.length === 0) return null;

  const toggle = (id: string) =>
    setTicked(ticked.includes(id) ? ticked.filter((one) => one !== id) : [...ticked, id]);

  return (
    <form action={deleteEmptyShelves} className="card space-y-3">
      <div>
        <h2 className="font-bold">Shelves</h2>
        <p className="text-sm text-muted">
          {shelves.length} in all
          {empty.length > 0
            ? `, ${empty.length} with nothing on ${empty.length === 1 ? "it" : "them"}.`
            : ". Every one of them has something on it."}
        </p>
      </div>

      {empty.length > 0 && (
        <>
          <ul className="space-y-1">
            {empty.map((shelf) => (
              <li key={shelf.id}>
                <label className="flex items-center gap-3 rounded-xl bg-shell px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    name="shelf_id"
                    value={shelf.id}
                    checked={ticked.includes(shelf.id)}
                    onChange={() => toggle(shelf.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">{shelf.name}</span>
                  <span className="shrink-0 text-xs text-muted">nothing on it</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setTicked(ticked.length === empty.length ? [] : empty.map((one) => one.id))}
              className="chip border-black/10 bg-white text-sm"
            >
              {ticked.length === empty.length ? "None of them" : "All of them"}
            </button>
            <button
              type="submit"
              disabled={ticked.length === 0}
              className="btn-primary px-5 disabled:opacity-40"
            >
              Delete {ticked.length > 0 ? ticked.length : ""} shelf
              {ticked.length === 1 ? "" : "s"}
            </button>
          </div>

          <p className="text-xs text-muted">
            Only a shelf with nothing on it and nothing filed under it can go,
            checked again when you press the button. The products are never
            touched.
          </p>
        </>
      )}

      <div className="border-t border-black/5 pt-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-sm font-semibold text-brand"
        >
          {open ? "Hide the rest" : "See every shelf and what is on it"}
        </button>

        {open && (
          <ul className="mt-2 space-y-1">
            {[...shelves]
              .sort((a, b) => b.items - a.items || a.name.localeCompare(b.name))
              .map((shelf) => (
                <li
                  key={shelf.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-shell px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{shelf.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {shelf.items === 0 ? "nothing on it" : `${shelf.items} on it`}
                    {/* Filed under, as against appearing on. A product sits on
                        several shelves and is filed under one of them, and a
                        shelf can hold the filing without being a shelf
                        anybody browses. */}
                    {shelf.filed > 0 && shelf.items === 0 && ` · ${shelf.filed} filed here`}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </form>
  );
}
