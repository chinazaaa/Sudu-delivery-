"use client";

import { useState } from "react";

/**
 * Pay-by-link: the student sends this to whoever is paying. The page it points
 * at shows the name, items and total, so nobody is asked to pay a bare link.
 */
export default function ShareLink({ label }: { label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sudu Delivery order", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* The student closed the share sheet. Nothing to report. */
    }
  }

  return (
    <button type="button" onClick={copy} className="btn-quiet w-full">
      {copied ? "Link copied" : label}
    </button>
  );
}
