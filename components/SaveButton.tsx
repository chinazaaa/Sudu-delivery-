"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A form that saves silently looks broken. This says what it is doing, and
 * confirms when it is done: pending while the action runs, then Saved for a
 * couple of seconds.
 */
export default function SaveButton({
  children = "Save",
  quiet = false,
  className = "",
}: {
  children?: React.ReactNode;
  /** Secondary styling, for the many small forms in the menu editor. */
  quiet?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(false);
  const was = useRef(false);

  useEffect(() => {
    if (was.current && !pending) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(timer);
    }
    was.current = pending;
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${quiet ? "btn-quiet" : "btn-primary"} ${className} ${
        saved ? "!bg-mint !text-white !border-transparent" : ""
      }`}
    >
      {pending ? "Saving…" : saved ? "Saved ✓" : children}
    </button>
  );
}
