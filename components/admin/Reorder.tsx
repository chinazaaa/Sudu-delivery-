"use client";

import { useTransition } from "react";

/**
 * Up and down, rather than a box asking for a number.
 *
 * Reordering is the sort of thing you do while looking at the list, on a
 * phone, deciding as you go. Typing 3 into a field and working out what that
 * does to everything else is not that.
 */
export default function Reorder({
  action,
  field,
  id,
  first,
  last,
  label,
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
}) {
  const [pending, start] = useTransition();

  function move(direction: "up" | "down") {
    const form = new FormData();
    form.set(field, id);
    form.set("direction", direction);
    start(() => {
      void action(form);
    });
  }

  return (
    <span className="flex shrink-0 flex-col gap-1">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={first || pending}
        aria-label={`Move ${label} up`}
        className="grid size-8 place-items-center rounded-lg border border-black/10 bg-white text-sm font-bold disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={last || pending}
        aria-label={`Move ${label} down`}
        className="grid size-8 place-items-center rounded-lg border border-black/10 bg-white text-sm font-bold disabled:opacity-30"
      >
        ↓
      </button>
    </span>
  );
}
