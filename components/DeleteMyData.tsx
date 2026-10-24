"use client";

import { useState } from "react";

import ActionButton from "@/components/ActionButton";

/**
 * Asked twice, because it cannot be asked again afterwards.
 *
 * Everything else on this page can be undone by ordering again. This
 * cannot: the name, the number, the block and the PIN are gone, and the
 * past orders keep the money and lose the person. A single press for
 * that, two taps below "Order this again", is a press somebody makes by
 * accident once and regrets permanently.
 *
 * So the first press only changes the question. The way out is the
 * bigger, quieter button, because the thing somebody wants most of the
 * time they land here by mistake is to leave.
 */
export default function DeleteMyData({
  action,
}: {
  action: () => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="btn-quiet"
      >
        Delete my data
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold">
        Delete everything? This cannot be undone.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="btn-primary"
        >
          Keep my data
        </button>
        <form action={action}>
          <ActionButton
            className="btn-quiet text-brand-dark"
            busy="Deleting…"
            done="Deleted ✓"
          >
            Yes, delete everything
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
