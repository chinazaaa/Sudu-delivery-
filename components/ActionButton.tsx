"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that says what it is doing. Anything that changes something
 * should answer, or the only way to know it worked is to go and look.
 *
 * SaveButton is the same idea for forms that save a value; this one is for
 * the rest: adding, removing, toggling, closing.
 *
 * It is the board's row action by default, thirty-four pixels and a 1.5px
 * outline, because that is what it almost always is: one of several things
 * you can do to a row. The default used to be the shop's forty-four pixel
 * chip, which meant every admin caller had to say `btn-admin btn-admin-sm`
 * to get the size it should have had anyway, and the ones that forgot put a
 * shop control on an admin page without anybody noticing.
 *
 * It sat under components/admin while admin was the only place that had
 * learnt to answer. The shop's own buttons need the same thing, so it lives
 * out here now; the default className is still the board's, and a shop
 * caller passes its own.
 */
export default function ActionButton({
  children,
  busy = "Working…",
  done = "Done ✓",
  value,
  className = "btn-admin btn-admin-sm",
  doneClassName = "!border-transparent !bg-mint !text-white",
  keepLabel = false,
  ...rest
}: {
  children: React.ReactNode;
  busy?: string;
  done?: string;
  /**
   * What this button sends, when its form has more than one.
   *
   * Taken as a prop rather than left in the spread so the button can tell
   * whether the press was its own.
   */
  value?: string;
  className?: string;
  /**
   * How it looks while it is saying Done.
   *
   * A filled green pill is the right answer for a button that is already a
   * pill. It is the wrong answer for the bare words that sit along the
   * bottom of a row, where a solid block of mint the width of "To the
   * front" reads as a different control appearing rather than the same one
   * confirming. Those pass the colour on the text instead.
   */
  doneClassName?: string;
  /**
   * For a button whose own appearance is the answer.
   *
   * A tick box that says "Asked for a review" is not waiting to be told it
   * worked: the tick appears. Swapping its words for "Working…" and then
   * "Done ✓" would collapse a checkbox into a green pill and back, which
   * reads as the row rebuilding itself. These keep their label and their
   * shape, and only go dim and unpressable while the server answers, which
   * is the whole of the missing feedback.
   */
  keepLabel?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const status = useFormStatus();
  /*
   * Only the button that was pressed answers.
   *
   * A row of four ends one form: Priced, Done, They ordered it, Drop. They
   * all sit inside it, so they all see the same pending flag, and without
   * this pressing Drop makes the other three say "Working…" as well, which
   * reads as the whole row having been pressed. A button that carries a
   * name and a value can tell: the form data says which value was sent.
   */
  const mine =
    rest.name === undefined || status.data === null
      ? true
      : status.data.get(rest.name) === String(value);
  const pending = status.pending && mine;
  const [finished, setFinished] = useState(false);
  const was = useRef(false);

  useEffect(() => {
    if (was.current && !pending) {
      setFinished(true);
      const timer = setTimeout(() => setFinished(false), 2000);
      return () => clearTimeout(timer);
    }
    was.current = pending;
  }, [pending]);

  return (
    <button
      type="submit"
      value={value}
      /* Both reasons, not whichever came last in the spread. A caller that
         passes its own disabled used to switch the pending one off with
         it, which left a form submittable twice while the server was
         still answering the first press. */
      disabled={status.pending || rest.disabled === true}
      className={`${className} ${
        keepLabel ? (pending ? "opacity-50" : "") : finished ? doneClassName : ""
      }`}
      {...rest}
    >
      {keepLabel ? children : pending ? busy : finished ? done : children}
    </button>
  );
}
