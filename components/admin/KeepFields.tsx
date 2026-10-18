"use client";

import { useEffect, useRef } from "react";

/**
 * Stops a form emptying its own dropdowns the moment you save it.
 *
 * React clears a form's fields once its action has run, on the assumption
 * that a form is a thing you fill in and send, like a comment box. These
 * are not that: they are settings, and what they should show after a save
 * is what you just saved.
 *
 * Text boxes survive it, because React writes a value attribute on them and
 * the clear puts that value back. A select has no such attribute: React
 * sets the chosen option in JavaScript and never marks it in the HTML, so
 * the clear has nothing to go back to and every dropdown drops to its first
 * option. That is why the hours all read seven in the morning after a save
 * and the real times came back the moment the page was loaded again.
 *
 * So the clear is called off. One of these inside a form covers every field
 * in it, however many there are, which beats making sixty dropdowns each
 * remember their own value.
 */
export default function KeepFields() {
  const mark = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = mark.current?.closest("form");
    if (!form) return;

    // The event is cancellable, and cancelling it leaves every field exactly
    // as the person left it.
    const hold = (event: Event) => event.preventDefault();
    form.addEventListener("reset", hold);
    return () => form.removeEventListener("reset", hold);
  }, []);

  return <span ref={mark} hidden aria-hidden />;
}
