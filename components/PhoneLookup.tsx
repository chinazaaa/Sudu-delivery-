"use client";

import { useActionState } from "react";
import { lookupLastOrder } from "@/app/actions";

export default function PhoneLookup({ initial }: { initial?: string }) {
  const [state, action, pending] = useActionState(lookupLastOrder, { error: null });

  return (
    <form action={action} className="card space-y-3">
      <div>
        <label className="label" htmlFor="phone">Your phone number</label>
        <input
          id="phone"
          name="phone"
          required
          inputMode="tel"
          defaultValue={initial}
          placeholder="0803 123 4567"
          className="field"
          autoComplete="tel"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Looking…" : "Find my last order"}
      </button>
    </form>
  );
}
