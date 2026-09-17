"use client";

import { useActionState } from "react";
import { signInWithPin, type PinState } from "@/app/actions";

export default function PinForm({
  next,
  label = "See my orders",
}: {
  /** Where to land after signing in. Defaults to the order history. */
  next?: string;
  label?: string;
} = {}) {
  const [state, action, pending] = useActionState<PinState, FormData>(signInWithPin, {
    error: null,
  });

  return (
    <form action={action} className="card space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="phone">Phone number</label>
        <input
          id="phone"
          name="phone"
          required
          inputMode="tel"
          placeholder="0803 123 4567"
          className="field"
          autoComplete="tel"
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
          We send your PIN on WhatsApp with your first order. Lost it? Message us and
          we will send it again.
        </p>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : label}
      </button>
    </form>
  );
}
