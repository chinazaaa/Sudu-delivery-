"use client";

import Link from "next/link";
import { useState } from "react";
import { GROUPS } from "@/lib/admin-nav";

/**
 * Everything that is not one of the four in the bar.
 *
 * The rail on a desk shows all twenty-eight at once because there is room.
 * On a phone there is not, so the board files them under their headings and
 * puts a box at the top to jump straight to one: typing "off" to reach
 * Offers is one thumb and no scrolling, which is the whole point of the
 * screen.
 */
export default function MoreList({
  waiting = {},
}: {
  waiting?: Record<string, number>;
}) {
  const [typed, setTyped] = useState("");
  const term = typed.trim().toLowerCase();

  const shown = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-2.5">
      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Jump to a page"
        aria-label="Jump to a page"
        className="field border-[1.5px] border-line bg-paper"
      />

      {shown.length === 0 && (
        <p className="card text-sm text-muted">No page here is called that.</p>
      )}

      {shown.map((group) => (
        <section key={group.name} className="card px-3.5 pb-1.5 pt-2.5">
          <p className="ticket text-muted">{group.name}</p>
          {group.items.map((item) => {
            const count = waiting[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[46px] items-center gap-2.5 border-t-[1.5px] border-rule px-0.5 py-3"
              >
                {/* Brand where something is waiting on that page, quiet
                    where nothing is. A row of red dots says nothing. */}
                <span
                  aria-hidden
                  className={`size-[7px] shrink-0 rounded-[2px] ${
                    count > 0 ? "bg-brand" : "bg-line"
                  }`}
                />
                <span className="flex-1 text-[14.5px] font-semibold">{item.label}</span>
                {count > 0 && (
                  <span className="font-mono text-[11px] font-semibold text-brand">{count}</span>
                )}
                <span aria-hidden className="text-[17px] text-muted">
                  ›
                </span>
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
