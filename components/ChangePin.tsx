"use client";

import { useActionState } from "react";
import { changeMyPin } from "@/app/promoter/actions";

/**
 * A promoter changing their own PIN.
 *
 * It hands back what went wrong rather than throwing, because a throw from
 * a server action is the error boundary: a yellow exclamation mark and a
 * minified React number where "that is not your current PIN" belongs. The
 * one message worth reading here is the one a mistyped PIN produces, and
 * that is exactly the one a thrown error loses.
 */
export default function ChangePin({ code }: { code: string }) {
  const [state, action, busy] = useActionState(changeMyPin, { done: "", error: "" });

  return (
    <form action={action} className="card space-y-3">
      <div>
        <h2 className="font-bold">Your PIN</h2>
        <p className="text-sm text-muted">
          Four digits, with your code ({code}), is how you sign in here.
          Change it whenever you like: your code stays the same, so everyone
          you have brought stays yours. The one you have now is asked for
          first, in case somebody else is looking at your screen.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-32">
          <label className="label" htmlFor="old_pin">
            PIN now
          </label>
          <input
            id="old_pin"
            name="old_pin"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            className="field tracking-widest"
          />
        </div>
        <div className="w-32">
          <label className="label" htmlFor="pin">
            New PIN
          </label>
          <input
            id="pin"
            name="pin"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            className="field tracking-widest"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-primary shrink-0 px-5">
          {busy ? "Changing…" : "Change it"}
        </button>
      </div>

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
    </form>
  );
}
