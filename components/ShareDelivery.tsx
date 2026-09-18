"use client";

import { useState } from "react";

/**
 * "Add yours to mine", for the hall group chat.
 *
 * The thing worth sharing is not the order, it is the car. One delivery fee
 * covers whatever travels in it, so every friend who joins makes it cheaper
 * for all of them. That is the whole pitch, and it is the sentence that goes
 * out with the link.
 */
export default function ShareDelivery({
  url,
  name,
  closes,
}: {
  url: string;
  /** Whose delivery it is, for the message. */
  name: string;
  /** When the run stops taking orders, so nobody shares a closed one. */
  closes: string;
}) {
  const [copied, setCopied] = useState(false);

  const message =
    `I am ordering food to campus with Sudu, closing ${closes}. ` +
    `Add yours to mine and we split one delivery fee: ${url}`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `Join ${name}'s delivery`, text: message, url });
        return;
      }
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* They closed the share sheet. Nothing to report. */
    }
  };

  return (
    <div className="rounded-2xl border-2 border-brand/30 bg-brand-tint p-4">
      <h2 className="font-bold text-brand-dark">Going in on this with friends?</h2>
      <p className="mt-1 text-sm text-ink/80">
        Send them this. Whatever they order rides in the same delivery, so between
        you there is one delivery fee instead of one each. They pay for their own
        food, on their own number.
      </p>
      <button type="button" onClick={share} className="btn-primary mt-3 w-full">
        {copied ? "Copied, now paste it in the group" : "Send my friends the link"}
      </button>
    </div>
  );
}
