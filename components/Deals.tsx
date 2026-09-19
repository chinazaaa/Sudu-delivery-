"use client";

import { useState } from "react";
import type { Deal } from "@/lib/coupons";

/**
 * What is on offer here, behind one button.
 *
 * An offer scattered across a badge, a banner and a strip along the top is
 * something people find by accident. One button on the menu they are already
 * reading is somewhere to look on purpose, and each deal says what it
 * actually asks of you rather than only what it is worth.
 */
export default function Deals({ deals }: { deals: Deal[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");

  if (deals.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border-2 border-brand/30 bg-brand-tint px-4 py-2 text-sm font-extrabold text-brand-dark"
      >
        <TagIcon />
        {deals.length} deal{deals.length === 1 ? "" : "s"} here
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-shell p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">What is on here</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-full bg-black/5 font-bold"
              >
                ×
              </button>
            </div>

            <ul className="space-y-3">
              {deals.map((deal) => (
                <li key={`${deal.title}${deal.code ?? ""}`} className="card">
                  <p className="font-extrabold text-brand-dark">{deal.title}</p>
                  <p className="mt-0.5 text-sm text-ink/80">{deal.detail}</p>
                  {deal.code && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(deal.code!);
                          setCopied(deal.code!);
                          setTimeout(() => setCopied(""), 2000);
                        } catch {
                          /* Blocked. The code is on screen to read. */
                        }
                      }}
                      className="mt-2 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold tracking-wide text-white"
                    >
                      {copied === deal.code ? "Copied" : deal.code}
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* One at a time, said once here rather than discovered at the
                checkout when a code is refused. */}
            <p className="mt-3 text-xs text-muted">
              One offer to an order. If two of these would fit, the cheaper one
              applies and the other is left alone.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function TagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <path d="M7.5 7.5h.01" />
    </svg>
  );
}
