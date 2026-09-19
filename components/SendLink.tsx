"use client";

import { useState } from "react";

/**
 * Sending somebody a link.
 *
 * Two buttons, because there are two answers and a third only looked like
 * choice. Nearly every link Sudu sends goes into a WhatsApp chat, so that one
 * is named: one tap instead of three, and it works on a laptop, where the
 * phone's share sheet does not exist at all. Everywhere else, Snapchat,
 * Instagram, a text message, is copy and paste, which people already do
 * without being taught.
 *
 * The sheet used to sit between them. It was a button whose label had to list
 * apps to explain itself, which is the tell that it was not a choice anybody
 * was making.
 *
 * wa.me with no number opens WhatsApp with the message written and lets them
 * pick the chat, which is the bit only they can do.
 */
export default function SendLink({
  message,
  link,
  label = "Send on WhatsApp",
  tone = "primary",
}: {
  /** The whole message, ending in the link. */
  message: string;
  /** Just the address. Copy puts this on the clipboard rather than the whole
   *  message, because somebody copying a link is nearly always about to write
   *  their own words around it, and a sentence they did not write is then
   *  something to delete. */
  link?: string;
  label?: string;
  tone?: "primary" | "quiet";
}) {
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link ?? message);
      setCopied("yes");
      setTimeout(() => setCopied("no"), 2500);
    } catch {
      // Blocked clipboard, or an insecure context. Showing them the text to
      // copy by hand beats a button that does nothing and says nothing.
      setCopied("failed");
    }
  };

  return (
    <div className="space-y-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${
          tone === "primary" ? "btn-primary" : "btn-quiet"
        } block w-full text-center`}
      >
        {label}
      </a>

      <button type="button" onClick={copy} className="btn-quiet w-full">
        {copied === "yes" ? "Copied" : "Copy link"}
      </button>

      {copied === "failed" && (
        <textarea
          readOnly
          rows={3}
          value={link ?? message}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={link ? "The link to copy" : "The message to copy"}
          className="field text-xs"
        />
      )}
    </div>
  );
}
