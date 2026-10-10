"use client";

import { useState } from "react";

/** Copies one short string, for account numbers and PINs read off a phone. */
export default function CopyText({
  value,
  label,
  className = "",
  look = "btn-quiet",
}: {
  value: string;
  label: string;
  className?: string;
  /** The button underneath. Admin draws its own smaller sizes, so a copy
   *  button there is `btn-admin btn-admin-sm` rather than the shop's. */
  look?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`${look} ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* Clipboard blocked. The number is on screen to read anyway. */
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
