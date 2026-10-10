"use client";

import { useActionState } from "react";
import { replyToMail } from "@/app/admin/actions";
import type { BulkState } from "@/app/admin/actions";

/**
 * The box a reply is written in.
 *
 * A client component for one reason: an email that has gone cannot be
 * called back, so the page has to be able to say it went, and say why it
 * did not without losing what was typed.
 */
export default function ReplyBox({
  mailId,
  to,
  subject,
}: {
  mailId: string;
  /** Who it goes to, shown rather than assumed: a letter from a shared
   *  address is one somebody will want to check before answering. */
  to: string;
  subject: string;
}) {
  const [state, act, busy] = useActionState<BulkState, FormData>(replyToMail, {
    error: null,
    done: null,
  });

  if (state.done) {
    return (
      <p className="rounded-xl border-2 border-mint bg-mint-tint px-4 py-3 text-sm font-semibold text-mint">
        Sent to {to}. It will land in the same conversation as their own email.
      </p>
    );
  }

  return (
    <form action={act} className="space-y-2.5">
      <input type="hidden" name="mail_id" value={mailId} />
      <p className="hint">
        To <span className="font-semibold">{to}</span> · {subject}
      </p>
      <label className="sr-only" htmlFor={`reply-${mailId}`}>
        Your reply
      </label>
      <textarea
        id={`reply-${mailId}`}
        name="body"
        rows={6}
        required
        placeholder="Write the reply here. Plain words: the lines come out as lines."
        className="field field-admin w-full py-2.5"
      />
      {state.error && (
        <p className="rounded-xl border-2 border-brand bg-brand-wash px-4 py-3 text-sm font-semibold text-brand-dark">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={busy} className="btn-admin-go disabled:opacity-60">
          {busy ? "Sending…" : "Send the reply"}
        </button>
        {/* Said beside the button rather than after the fact. */}
        <span className="hint">There is no undo once it has gone.</span>
      </div>
    </form>
  );
}
