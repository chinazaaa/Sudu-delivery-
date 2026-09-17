"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that says what it is doing. Anything that changes something
 * should answer, or the only way to know it worked is to go and look.
 *
 * SaveButton is the same idea for forms that save a value; this one is for
 * the rest: adding, removing, toggling, closing.
 */
export default function ActionButton({
  children,
  busy = "Working…",
  done = "Done ✓",
  className = "chip border-black/10 bg-white",
  ...rest
}: {
  children: React.ReactNode;
  busy?: string;
  done?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
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
      disabled={pending}
      className={`${className} ${finished ? "!border-transparent !bg-mint !text-white" : ""}`}
      {...rest}
    >
      {pending ? busy : finished ? done : children}
    </button>
  );
}
