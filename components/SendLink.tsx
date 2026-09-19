"use client";

import { useEffect, useState } from "react";

/**
 * Sending somebody a link.
 *
 * Three ways, because there are three real cases and one button cannot be all
 * of them. Most of this goes into a WhatsApp chat, so that one is named and
 * first: one tap instead of three, and it works on a laptop, where a share
 * sheet does not exist at all. But a friend on Snapchat or Instagram is not a
 * rare case, so the phone's own sheet stays, one line down, for everywhere
 * else. And copying is the answer when both fail, or when somebody just wants
 * the text.
 *
 * wa.me with no number opens WhatsApp with the message written and lets them
 * pick the chat, which is the bit only they can do.
 */
export default function SendLink({
  message,
  label = "Send on WhatsApp",
  tone = "primary",
}: {
  /** The whole message, ending in the link. */
  message: string;
  label?: string;
  tone?: "primary" | "quiet";
}) {
  const [copied, setCopied] = useState<"no" | "yes" | "failed">("no");
  // Only a phone has one, and only the browser knows. Asked after mount so
  // the server and the first render agree.
  const [hasSheet, setHasSheet] = useState(false);
  useEffect(() => setHasSheet(typeof navigator !== "undefined" && "share" in navigator), []);

  const elsewhere = async () => {
    try {
      // Only `text`, which already ends in the link. Passing `url` as well
      // makes the sheet append it a second time.
      await navigator.share({ text: message });
    } catch {
      /* They closed the sheet. Nothing to report. */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
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

      <div className="flex gap-2">
        {hasSheet && (
          <button type="button" onClick={elsewhere} className="btn-quiet flex-1">
            Snapchat, Instagram, anywhere else
          </button>
        )}
        <button type="button" onClick={copy} className="btn-quiet flex-1">
          {copied === "yes" ? "Copied" : "Copy"}
        </button>
      </div>

      {copied === "failed" && (
        <textarea
          readOnly
          rows={3}
          value={message}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="The message to copy"
          className="field text-xs"
        />
      )}
    </div>
  );
}
