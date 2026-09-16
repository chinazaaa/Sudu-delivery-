"use client";

import { useState } from "react";

/**
 * Adding an item should not mean scrolling past sixty of them. The button
 * sits with the heading and opens a dialog over the list.
 */
export default function AddItemDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
        + Add item
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-shell sm:rounded-3xl">
            <header className="flex items-center justify-between border-b border-black/5 bg-paper px-4 py-3">
              <h2 className="text-lg font-bold">Add an item</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full bg-black/[0.06] font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <div className="overflow-y-auto p-4">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
