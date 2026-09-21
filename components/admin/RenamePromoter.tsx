"use client";

import { useActionState } from "react";
import { renamePromoter } from "@/app/admin/actions";

/**
 * Changing a promoter's code, which only admin can do.
 *
 * Not on their own page on purpose. The code is what every customer they
 * have ever brought points at, so a rename is a decision about somebody
 * else's money as much as their own, and it changes their sign-in from
 * under them. Asking for it is the promoter's part; doing it is yours.
 *
 * It hands back what happened rather than throwing, because a throw from a
 * server action is the error boundary, and "that code belongs to somebody
 * else" is exactly the sentence that gets lost in one.
 */
export default function RenamePromoter({ code }: { code: string }) {
  const [state, action, busy] = useActionState(renamePromoter, { done: "", error: "" });

  return (
    <form action={action} className="mt-3 space-y-2 border-t border-black/5 pt-3">
      <input type="hidden" name="code" value={code} />

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <label className="label" htmlFor={`new-code-${code}`}>
            Change their code
          </label>
          <input
            id={`new-code-${code}`}
            name="new_code"
            placeholder={code}
            autoComplete="off"
            className="field py-2 text-sm uppercase"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-quiet shrink-0 px-4 py-2 text-sm">
          {busy ? "Renaming…" : "Rename"}
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

      <p className="text-xs text-muted">
        Everybody they brought comes with it, and so does every payout. Their
        sign-in changes too, so send them their details again afterwards.
      </p>
    </form>
  );
}
