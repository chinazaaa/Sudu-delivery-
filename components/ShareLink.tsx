"use client";

import { useEffect, useState } from "react";
import SendLink from "./SendLink";

/**
 * Pay-by-link: the student sends this to whoever is paying. The page it points
 * at shows the name, items and total, so nobody is asked to pay a bare link.
 *
 * Named buttons rather than a share sheet, for the same reason as everywhere
 * else: whoever is paying is in WhatsApp, and on a laptop the sheet does not
 * exist at all.
 */
export default function ShareLink({ label }: { label: string }) {
  // The address is only knowable in the browser, and only after mount, so the
  // server and the first render agree on nothing being there yet.
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(window.location.href), []);

  if (!url) {
    return (
      <button type="button" disabled className="btn-quiet w-full opacity-60">
        {label}
      </button>
    );
  }

  return (
    <SendLink
      message={`Please help me pay for this Sudu order: ${url}`}
      label={label}
      tone="quiet"
    />
  );
}
