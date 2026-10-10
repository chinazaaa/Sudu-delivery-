"use client";

import { useTransition } from "react";

/**
 * Up and down, rather than a box asking for a number.
 *
 * Reordering is the sort of thing you do while looking at the list, on a
 * phone, deciding as you go. Typing 3 into a field and working out what that
 * does to everything else is not that.
 *
 * The pair is drawn as the board's row action, which is `btn-admin-sm`: a
 * 1.5px outline at thirty-four pixels. It used to be a hairline grey square
 * belonging to no part of the design system, and it sat in a card whose
 * outline is 2px Ink, so the one control in the row read as a disabled one.
 */
export default function Reorder({
  action,
  field,
  id,
  first,
  last,
  label,
  extra,
}: {
  /** The server action that moves one row. */
  action: (form: FormData) => Promise<void>;
  /** What the action calls the row: restaurant_id, slide_id. */
  field: string;
  id: string;
  first: boolean;
  last: boolean;
  /** Read out to anyone using a screen reader. */
  label: string;
  /** Anything else the action needs to know, such as which run this is and
   *  the order currently on screen. Sent with every press. */
  extra?: Record<string, string>;
}) {
  const [pending, start] = useTransition();

  function move(direction: "up" | "down") {
    const form = new FormData();
    form.set(field, id);
    form.set("direction", direction);
    for (const [key, value] of Object.entries(extra ?? {})) form.set(key, value);
    start(() => {
      void action(form);
    });
  }

  return (
    <span className="flex shrink-0 flex-col gap-[3px]">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={first || pending}
        aria-label={`Move ${label} up`}
        className="btn-admin btn-admin-sm px-2 disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={last || pending}
        aria-label={`Move ${label} down`}
        className="btn-admin btn-admin-sm px-2 disabled:opacity-30"
      >
        ↓
      </button>
    </span>
  );
}
