"use client";

import { useActionState } from "react";
import { askToPromote, type ApplyState } from "@/app/actions-apply";

/**
 * The form, at the bottom of the page that explains the job.
 *
 * Four fields, one of which is optional. Anything longer is a form somebody
 * abandons, and nothing beyond this is needed to decide: a name, a way to
 * reach them, and where they would be posting.
 */
export default function ApplyToPromote() {
  const [state, act, busy] = useActionState<ApplyState, FormData>(askToPromote, {
    error: null,
    sent: false,
  });

  if (state.sent) {
    return (
      <section className="card space-y-2 border-mint bg-white">
        <h2 className="section-title text-mint">That is in</h2>
        <p className="text-[15px] leading-relaxed">
          We read these by hand, so give it a day or two. If it is a yes you will get a
          WhatsApp with your link and a PIN for your own page. If it is not, you will still
          hear back.
        </p>
      </section>
    );
  }

  return (
    <section className="card space-y-4" id="apply">
      <div>
        <h2 className="section-title">Ask to join</h2>
        <p className="mt-1 text-sm text-muted">
          Four questions, and only three of them matter.
        </p>
      </div>

      <form action={act} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Your name</span>
            <input name="name" className="field" required maxLength={80} autoComplete="name" />
          </label>
          <label className="block">
            <span className="label">WhatsApp number</span>
            <input
              name="phone"
              type="tel"
              className="field"
              required
              maxLength={20}
              autoComplete="tel"
              placeholder="0803 000 0000"
            />
          </label>
        </div>

        <label className="block">
          <span className="label">Where would you be posting?</span>
          <input
            name="reach"
            className="field"
            required
            maxLength={160}
            placeholder="My Instagram, 2,000 followers, mostly PAU"
          />
          <span className="mt-1 block text-xs text-muted">
            An account, a group chat, a hall. This is the whole of what we decide on, so be
            specific rather than impressive.
          </span>
        </label>

        <label className="block">
          <span className="label">Anything else? Optional</span>
          <textarea name="said" rows={3} className="field" maxLength={1000} />
        </label>

        {state.error && (
          <p className="rounded-xl border-2 border-brand bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-dark">
            {state.error}
          </p>
        )}

        <button className="btn-primary w-full sm:w-auto" disabled={busy}>
          {busy ? "Sending…" : "Send it"}
        </button>
      </form>
    </section>
  );
}
