"use client";

import { useState } from "react";

/**
 * Removing a day from the week, asked twice. It is one tap from a schedule
 * that quietly stops opening runs, which nobody would notice until a Friday
 * with nothing on it.
 */
export default function ConfirmRemove({ id }: { id: string }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="chip border-black/10 bg-white py-1.5 text-xs text-brand"
      >
        Remove
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="submit"
        name="schedule_id"
        value={id}
        formAction={async (form: FormData) => {
          const { deleteScheduleRun } = await import("@/app/admin/actions");
          await deleteScheduleRun(form);
        }}
        className="chip border-transparent bg-brand py-1.5 text-xs text-white"
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
