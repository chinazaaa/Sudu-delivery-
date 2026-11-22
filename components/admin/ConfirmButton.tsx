"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

/**
 * A button that asks first. Used for the things a customer sees the result of,
 * which should never happen on a tap in a pocket.
 */
export default function ConfirmButton({
  children,
  confirm,
  question = "Are you sure?",
  className = "",
  tone = "admin",
}: {
  children: React.ReactNode;
  /** What the button says once it is asking. */
  confirm: string;
  /** What the pop-up asks, in a few words. */
  question?: string;
  className?: string;
  /** "bare" drops the chip styling, for the small inline × and Remove
   *  links. "admin" and "bad" are the board's own sizes, thirty-four pixels
   *  rather than the shop's forty-four, for an action that sits inside a row
   *  of other actions; "bad" is the destructive one, which the design system
   *  draws as an outline and never filled. */
  tone?: "quiet" | "brand" | "bare" | "admin" | "bad";
}) {
  const [asking, setAsking] = useState(false);
  const { pending } = useFormStatus();

  const small = tone === "admin" || tone === "bad";
  const resting = small
    ? `btn-admin btn-admin-sm ${tone === "bad" ? "btn-admin-bad" : ""}`
    : tone === "bare"
      ? ""
      : "chip border-black/10 bg-white";

  const trigger = useRef<HTMLButtonElement>(null);

  // Some buttons already put the question in their confirm label ("Send to
  // every customer with the app?"). Ask that as the question and answer
  // "Yes", rather than showing it twice.
  const asksItself = confirm.trim().endsWith("?");
  const asked = asksItself && question === "Are you sure?" ? confirm : question;
  const answer = asksItself ? "Yes, go ahead" : confirm;

  const dialog =
    asking && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
            onClick={() => setAsking(false)}
          >
            <div
              className="w-full max-w-sm space-y-4 rounded-2xl bg-paper p-5 shadow-card"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-lg font-extrabold">{asked}</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    // The pop-up lives on the page, not inside the form, so
                    // it sends the form that the button belongs to.
                    trigger.current?.form?.requestSubmit();
                    setAsking(false);
                  }}
                  className={`min-h-[48px] rounded-full px-4 text-base font-extrabold text-white ${
                    tone === "bad" ? "bg-brand-dark" : "bg-ink"
                  }`}
                >
                  {pending ? "…" : answer}
                </button>
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  className="min-h-[44px] rounded-full border-2 border-ink bg-white px-4 text-base font-bold"
                >
                  Not yet
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setAsking(true)}
        className={`${resting} ${tone === "brand" ? "text-brand" : ""} ${className}`}
      >
        {children}
      </button>
      {dialog}
    </>
  );
}
