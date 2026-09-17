"use client";

import { useState } from "react";

/**
 * The sheet is a snapshot: the moment it is sent, anything that changes after
 * makes it a lie. Sending it and closing the run are therefore one action, so
 * nobody ends up with three sheets in their chat and no idea which is current.
 *
 * Sending without closing is still there, for a look at the list mid-week.
 */
export default function SendSheet({
  href,
  closeRun,
  batchId,
  open,
}: {
  href: string;
  closeRun: (form: FormData) => Promise<void>;
  batchId: string;
  /** False once the run is already closed: then it is only a send. */
  open: boolean;
}) {
  const [asking, setAsking] = useState(false);

  if (!open) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-quiet px-4 py-2.5 text-sm"
      >
        Send sheet to my WhatsApp
      </a>
    );
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="btn-quiet px-4 py-2.5 text-sm"
      >
        Send sheet to my WhatsApp
      </button>
    );
  }

  return (
    <form action={closeRun} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="stage" value="closed" />
      <button
        type="submit"
        onClick={() => window.open(href, "_blank", "noopener")}
        className="btn-primary px-4 py-2.5 text-sm"
      >
        Send and close the run
      </button>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => setAsking(false)}
        className="btn-quiet px-4 py-2.5 text-sm"
      >
        Just send it
      </a>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="text-sm font-semibold text-muted"
      >
        Cancel
      </button>
    </form>
  );
}
