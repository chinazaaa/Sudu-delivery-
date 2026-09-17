"use client";

import { useState } from "react";

/** Copies one short string, for account numbers and PINs read off a phone. */
export default function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="btn-quiet"
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
