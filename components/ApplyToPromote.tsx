"use client";

import { useActionState } from "react";
import { askToPromote, type ApplyState } from "@/app/actions-apply";

/**
 * The form, under the card that says to message us instead.
 *
 * The board asks for five things: a name, a number, where they live, the
 * code they want, and who they would share it with. The hostel and the code
 * are new, and they are the two questions that were being asked by hand on
 * WhatsApp afterwards, which is the whole reason the message is quicker.
 *
 * Nothing longer than this. Anything more is a form somebody abandons, and
 * nothing beyond it is needed to decide.
 */
export default function ApplyToPromote() {
  const [state, act, busy] = useActionState<ApplyState, FormData>(askToPromote, {
    error: null,
    sent: false,
  });

  if (state.sent) {
    return (
      <section className="card space-y-2 border-mint" id="apply">
        <h2 className="font-display text-[22px] font-black uppercase leading-none text-mint sm:text-[26px]">
          That is in
        </h2>
        <p className="text-[15px] leading-relaxed">
          We read these by hand, so give it a day or two. If it is a yes you will get a
          WhatsApp with your link and a PIN for your own page. If it is not, you will still
          hear back.
        </p>
      </section>
    );
  }

  return (
    <section className="card" id="apply">
      <h2 className="font-display text-[22px] font-black uppercase leading-none sm:text-[26px]">
        Or fill this instead
      </h2>
      <p className="hint mb-4 mt-1">
        If you would rather not message. We read these the same day.
      </p>

      <form action={act} className="flex flex-col gap-3">
        <label className="block">
          <span className="label">Your name</span>
          <input name="name" className="field" required maxLength={80} autoComplete="name" placeholder="Onize Aliyu" />
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

        <label className="block">
          <span className="label">Hostel or block</span>
          <input name="hostel" className="field" maxLength={80} placeholder="Queen Mary" />
        </label>

        <label className="block">
          <span className="label">The code you want</span>
          {/* The address around it, shown rather than explained, so it is
              obvious that the box takes one short word and not a link. */}
          <span className="flex items-center gap-1.5">
            <span className="shrink-0 whitespace-nowrap font-mono text-[13.5px] text-muted">
              sudu.store/s/
            </span>
            <input name="wanted_code" className="field" maxLength={24} placeholder="onize" />
          </span>
          <span className="mt-1 block text-xs text-muted">
            We will tell you if it is taken.
          </span>
        </label>

        <label className="block">
          <span className="label">Who will you share it with?</span>
          <textarea
            name="reach"
            rows={2}
            className="field"
            required
            maxLength={160}
            placeholder="My block group, my class group…"
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
          <p className="rounded-xl border-2 border-brand bg-brand-wash px-4 py-3 text-sm font-semibold text-brand-dark">
            {state.error}
          </p>
        )}

        <button className="btn-quiet w-full" disabled={busy}>
          {busy ? "Sending…" : "Send the form"}
        </button>
      </form>
    </section>
  );
}
