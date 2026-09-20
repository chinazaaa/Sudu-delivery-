"use client";

import { useActionState } from "react";
import { saveSkincare } from "@/app/admin/actions";

/**
 * The skincare settings form, which says what happened rather than falling
 * over.
 *
 * These are the newest columns in the shop, so this is the form most likely
 * to meet a database that has not had the migration run yet. That used to be
 * the error boundary: an exclamation mark and a minified React number, where
 * a sentence saying "run the migration" belongs.
 */
export default function SkincareForm({ children }: { children: React.ReactNode }) {
  const [state, action, busy] = useActionState(saveSkincare, { done: "", error: "" });

  return (
    <form action={action} className="card space-y-3">
      {children}

      {state.error !== "" && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}
      {state.done !== "" && (
        <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          {state.done}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary px-5">
        {busy ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
