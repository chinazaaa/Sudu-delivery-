"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A button that asks first. Used for the things a customer sees the result of,
 * which should never happen on a tap in a pocket.
 */
export default function ConfirmButton({
  children,
  confirm,
  className = "",
  tone = "admin",
}: {
  children: React.ReactNode;
  /** What the button says once it is asking. */
  confirm: string;
  className?: string;
  /** "bare" drops the chip styling, for the small inline × and Remove
   *  links. "admin" and "bad" are the board's own sizes, thirty-four pixels
   *  rather than the shop's forty-four, for an action that sits inside a row
   *  of other actions; "bad" is the destructive one, which the design system
   *  draws as an outline and never filled. */
  tone?: "quiet" | "brand" | "bare" | "admin" | "bad";
}) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  const small = tone === "admin" || tone === "bad";
  const resting = small
    ? `btn-admin btn-admin-sm ${tone === "bad" ? "btn-admin-bad" : ""}`
    : tone === "bare"
      ? ""
      : "chip border-black/10 bg-white";

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`${resting} ${tone === "brand" ? "text-brand" : ""} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="submit"
        disabled={pending}
        className={
          small
            ? `btn-admin btn-admin-sm ${
                tone === "bad"
                  ? "border-brand-dark bg-brand-dark text-white hover:bg-brand-dark"
                  : "border-ink bg-ink text-white hover:bg-ink"
              } ${className}`
            : `chip border-transparent ${
                tone === "brand" ? "bg-brand text-white" : "bg-ink text-white"
              } ${className}`
        }
      >
        {pending ? "…" : confirm}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="min-h-[44px] px-2 text-xs font-semibold text-muted sm:min-h-0"
      >
        No
      </button>
    </span>
  );
}
