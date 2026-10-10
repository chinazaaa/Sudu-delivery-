"use client";

import { useState } from "react";

/**
 * Removing a day from the week, asked twice. It is one tap from a schedule
 * that quietly stops opening runs, which nobody would notice until a Friday
 * with nothing on it.
 *
 * Drawn as the board's destructive row action: thirty-four pixels, outlined
 * in Tomato Deep and never filled until it is asking. It used to be the
 * shop's forty-four pixel chip, which is a control the admin does not own,
 * so an admin page could not use this at all without putting a shop button
 * on itself.
 */
export default function ConfirmRemove({
  id,
  action,
  field = "schedule_id",
}: {
  id: string;
  /** What the id is called on the form. A day off the week and a photograph
   *  off a parcel are the same two taps and different names. */
  field?: string;
  /** The server action, handed in rather than imported here. Reaching for it
   *  from inside the browser made a button whose failures went nowhere. */
  action: (form: FormData) => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="btn-admin btn-admin-sm btn-admin-bad"
      >
        Remove
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="submit"
        name={field}
        value={id}
        formAction={action}
        className="btn-admin btn-admin-sm border-brand-dark bg-brand-dark text-white hover:bg-brand-dark"
      >
        Yes, remove it
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="px-1 text-xs font-semibold text-muted"
      >
        No
      </button>
    </span>
  );
}
