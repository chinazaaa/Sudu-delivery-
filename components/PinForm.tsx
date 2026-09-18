"use client";

import { useActionState, useState } from "react";
import { signInWithPin, type PinState } from "@/app/actions";
import { whatsappLink } from "@/lib/settings";

/** The message that opens, with their own number in it when they have typed
 *  one. It is sent from their phone, so we know who is asking. */
function lostPinLink(number: string, phone: string): string {
  const typed = phone.trim();
  return (
    whatsappLink(
      number,
      "Hi, I cannot find my Sudu PIN." +
        (typed ? ` My number is ${typed}.` : "") +
        " Please send it to me."
    ) ?? "#"
  );
}

export default function PinForm({
  next,
  label = "See my orders",
  whatsapp = null,
}: {
  /** Where to land after signing in. Defaults to the order history. */
  next?: string;
  label?: string;
  /** The shop's WhatsApp number, for somebody who has lost their PIN. */
  whatsapp?: string | null;
} = {}) {
  const [state, action, pending] = useActionState<PinState, FormData>(signInWithPin, {
    error: null,
  });

  // Carried into the message, so nobody has to type their number twice and
  // we can find them without a conversation about it.
  const [phone, setPhone] = useState("");

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
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
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
          We send your PIN on WhatsApp with your first order.
        </p>
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : label}
      </button>

      {/* A PIN is only ever sent to the number it belongs to, so somebody who
          has lost theirs asks for it themselves rather than through a friend. */}
      {whatsapp && (
        <a
          href={lostPinLink(whatsapp, phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-semibold text-brand"
        >
          Do not have your PIN? Message us
        </a>
      )}
    </form>
  );
}
