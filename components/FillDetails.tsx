"use client";

import { useActionState, useEffect, useState } from "react";
import { fillMyDetails, type FillState } from "@/app/actions";

/**
 * "I have ordered before." The number and PIN bring back the name and block
 * that were used last time, so a regular fills the form in two taps and can
 * still edit anything before placing the order.
 */
export default function FillDetails({
  phone,
  onFilled,
}: {
  phone: string;
  onFilled: (me: { name: string; hostel: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FillState, FormData>(fillMyDetails, {
    error: null,
    me: null,
  });

  useEffect(() => {
    if (state.me) {
      onFilled(state.me);
      setOpen(false);
    }
    // onFilled is a fresh closure each render; the details are what matter.
  }, [state.me]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-brand"
      >
        Ordered before? Fill this in for me
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-black/10 bg-shell p-3">
      <p className="text-sm font-semibold">Your number and PIN</p>
      <div className="flex flex-wrap gap-2">
        <input
          name="phone"
          form="fill-details"
          defaultValue={phone}
          inputMode="tel"
          placeholder="0803 123 4567"
          className="field grow py-2 text-sm"
        />
        <input
          name="pin"
          form="fill-details"
          inputMode="numeric"
          maxLength={4}
          placeholder="PIN"
          className="field w-24 py-2 text-sm"
        />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          form="fill-details"
          disabled={pending}
          className="btn-quiet px-4 py-2 text-sm"
        >
          {pending ? "Checking…" : "Fill it in"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-semibold text-muted"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-muted">
        The PIN came with your first order on WhatsApp. It is asked for so that
        nobody else can look up where you live.
      </p>

      {/* Outside the checkout form: a form cannot be nested in another. */}
      <form id="fill-details" action={action} className="hidden" />
    </div>
  );
}
