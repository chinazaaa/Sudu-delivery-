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
  look = "btn-primary",
  name,
  value,
}: {
  children?: React.ReactNode;
  className?: string;
  /**
   * What this particular button says when it is the one that was pressed.
   *
   * A form with two ways to commit is one form, not two: the offer board
   * ends on "Save as off" beside "Save and go live", and the difference
   * between them is a single field. Without this a page has to choose
   * between two forms holding two copies of the same five questions, or a
   * hidden input nobody can see the state of.
   */
  name?: string;
  value?: string;
  /**
   * The button underneath, for pages whose buttons are not the shop's.
   *
   * Admin is drawn at its own sizes, forty-four pixels rather than the
   * shop's fifty-two, so a save button on an admin page has to be able to
   * be `btn-admin-go` instead. It stays the shop's orange button unless a
   * page says otherwise, which is every caller that existed before this.
   */
  look?: string;
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
      name={name}
      value={value}
      disabled={pending}
      className={`${look} ${className} ${
        saved ? "!bg-mint !text-white !border-transparent" : ""
      }`}
    >
      {pending ? "Saving…" : saved ? "Saved ✓" : children}
    </button>
  );
}
