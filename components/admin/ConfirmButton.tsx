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
  tone = "quiet",
}: {
  children: React.ReactNode;
  /** What the button says once it is asking. */
  confirm: string;
  className?: string;
  tone?: "quiet" | "brand";
}) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`chip border-black/10 bg-white ${
          tone === "brand" ? "text-brand" : ""
        } ${className}`}
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
        className={`chip border-transparent ${
          tone === "brand" ? "bg-brand text-white" : "bg-ink text-white"
        } ${className}`}
      >
        {pending ? "…" : confirm}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="px-1 text-xs font-semibold text-muted"
      >
        No
      </button>
    </span>
  );
}
