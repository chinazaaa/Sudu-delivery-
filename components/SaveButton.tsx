"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A form that saves silently looks broken. This says what it is doing, and
 * confirms when it is done: pending while the action runs, then Saved for a
 * couple of seconds.
 *
 * Always the orange button, never a quiet one. There used to be a `quiet`
 * flag for "the many small forms in the menu editor", and every form in
 * admin had taken it, so every save button on every admin page was white on
 * white. Saving a restaurant was indistinguishable from the borders around
 * it, and finding it meant scrolling the page looking for the thing you had
 * already scrolled past. The button that commits the change is the one thing
 * on an editing page that should be impossible to miss.
 */
export default function SaveButton({
  children = "Save",
  className = "",
}: {
  children?: React.ReactNode;
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
      className={`btn-primary ${className} ${
        saved ? "!bg-mint !text-white !border-transparent" : ""
      }`}
    >
      {pending ? "Saving…" : saved ? "Saved ✓" : children}
    </button>
  );
}
