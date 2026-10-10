"use client";

import { useActionState } from "react";
import { signIn, type PromoterSignIn } from "@/app/promoter/actions";

export default function PromoterLogin() {
  const [state, action, pending] = useActionState<PromoterSignIn, FormData>(signIn, {
    error: null,
  });

  return (
    <form action={action} className="card space-y-3">
      <div>
        <label className="label" htmlFor="code">Your code</label>
        <input
          id="code"
          name="code"
          required
          autoCapitalize="characters"
          placeholder="TOBI"
          className="field uppercase"
        />
      </div>
      <div>
        <label className="label" htmlFor="pin">PIN</label>
        <input
          id="pin"
          name="pin"
          required
          inputMode="numeric"
          maxLength={4}
          placeholder="4 digits"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          We send it on WhatsApp. Ask us if you have lost it.
        </p>
      </div>
      {state.error && (
        <p className="rounded-xl border-2 border-brand bg-brand-wash px-3 py-2 text-sm font-semibold text-brand-dark">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "See what I have earned"}
      </button>
    </form>
  );
}
