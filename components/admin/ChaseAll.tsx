"use client";

import { useState } from "react";

/**
 * The phone bar on the New in cut: chasing everybody who still owes.
 *
 * Chasing somebody is sending them a message, so that is what the bar does:
 * one tap hands over the messages, one per person, and WhatsApp opens them
 * one at a time. Nothing in the orders table records that anybody was
 * chased — there is no column for it — so the bar writes nothing down, and
 * the panel says so rather than letting the word "mark" imply it.
 *
 * The list is hidden until the bar is tapped, because nine WhatsApp links
 * standing over the page is the page gone.
 */
export default function ChaseAll({
  people,
}: {
  people: { id: string; name: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  if (people.length === 0) return null;

  return (
    <div className="phone-bar">
      {open && (
        <div className="mb-2 max-h-[38vh] overflow-y-auto overscroll-contain border-b-[1.5px] border-rule pb-2">
          <p className="hint mb-2">
            WhatsApp opens one person at a time. These are the {people.length}{" "}
            messages, written and ready to send. Nothing is written down as
            chased: the message is the chase.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {people.map((one) => (
              <a
                key={one.id}
                href={one.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin btn-admin-sm"
              >
                {one.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="btn-admin min-h-[50px] w-full"
      >
        {open ? "Hide the messages" : `Mark all ${people.length} as chased`}
      </button>
    </div>
  );
}
