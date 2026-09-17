"use client";

import { useState } from "react";

/** Copies one short string, for account numbers and PINs read off a phone. */
export default function CopyText({
  value,
  label,
  className = "",
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`btn-quiet ${className}`}
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
