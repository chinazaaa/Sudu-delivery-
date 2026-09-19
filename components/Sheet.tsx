"use client";

import { useEffect } from "react";

/**
 * A sheet that can be got out of.
 *
 * Every one of these used to be a panel on a dark background with no way
 * back except the button that did the thing: tapping beside it did nothing,
 * there was no cross, and on a phone there is no Escape key to fall back on.
 * Somebody who opened one by accident had to answer it.
 */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        // The panel swallows its own taps, or every press inside it would
        // close the thing it was pressed in.
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-3xl bg-paper p-5 shadow-bar"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-lg font-bold"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
