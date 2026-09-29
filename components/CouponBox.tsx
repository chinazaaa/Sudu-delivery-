"use client";

import { useEffect, useState, useTransition } from "react";
import { tryCoupon } from "@/app/actions";
import { naira } from "@/lib/money";

/**
 * A code, checked before the order is placed. Typing one and finding out at
 * the end whether it worked is the wrong way round: the whole point of a code
 * is the number it takes off, so it says so before anybody commits.
 *
 * The action is called directly rather than through a second form. Checkout
 * is already a form, a form cannot hold another, and pointing a button at one
 * elsewhere with the form attribute does not survive a server action.
 */
export default function CouponBox({
  batchId,
  cart,
  phone,
  applied,
  onApplied,
  perk = null,
}: {
  batchId: string;
  /** The cart as it will be posted: ids and quantities. */
  cart: string;
  phone: string;
  applied: { code: string; discount: number } | null;
  onApplied: (applied: { code: string; discount: number } | null) => void;
  /** What the link they arrived on is already worth. Nobody typed it, so it
   *  has no code to show, but it holds the one offer this order gets. */
  perk?: { label: string; discount: number } | null;
}) {
  const [code, setCode] = useState("");
  // Opened by hand. A box sitting open under a discount that is already on
  // reads as an invitation to add a second one, and there is no second one:
  // whatever is typed here replaces what is there.
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // The order changing takes a code off; the box should not still claim it.
  useEffect(() => {
    if (!applied) setLabel(null);
  }, [applied]);

  function check() {
    const wanted = code.trim().toUpperCase();
    if (!wanted) {
      setError("Enter a code.");
      return;
    }

    setError(null);
    start(async () => {
      const form = new FormData();
      form.set("coupon", wanted);
      form.set("batch_id", batchId);
      form.set("cart", cart);
      form.set("phone", phone);

      const result = await tryCoupon(
        { error: null, code: null, discount: 0, label: null },
        form
      );

      if (result.code) {
        onApplied({ code: result.code, discount: result.discount });
        setLabel(result.label);
        setError(null);
        setOpen(false);
        return;
      }

      onApplied(null);
      setLabel(null);
      setError(result.error ?? "That code did not work.");
    });
  }

  // Something already has the slot, and the box has nothing to add to it.
  if ((applied || perk) && !open) {
    return (
      <div className="border-t border-black/10 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mint/10 px-3 py-2">
          <p className="min-w-0 text-sm font-semibold text-mint">
            {/* The link's own wording already says what it is worth, so
                adding "₦500 off" to "₦500 off your first delivery" would
                say it twice. */}
            {applied ? `${applied.code} applied: ${naira(applied.discount)} off` : perk!.label}
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              // A typed code is theirs to take off. The link's is not: it
              // comes back by itself the moment the box is empty again.
              if (applied) {
                onApplied(null);
                setLabel(null);
              }
            }}
            className="shrink-0 text-sm font-medium text-brand underline underline-offset-2"
          >
            {applied ? "Use a different code" : "I have a code"}
          </button>
        </div>
        {perk && !applied && (
          <p className="mt-1 text-xs text-muted">
            Only one offer applies at a time, so a code would go instead of
            this one.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-black/10 pt-2">
      <label className="label" htmlFor="coupon-code">Discount code</label>
      <div className="flex gap-2">
        <input
          id="coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // Enter in this box must not place the order.
            event.preventDefault();
            check();
          }}
          placeholder="If you have one"
          autoCapitalize="characters"
          className="field grow py-2 uppercase"
        />
        <button
          type="button"
          onClick={check}
          disabled={pending}
          className="btn-quiet shrink-0 px-4 py-2 text-sm"
        >
          {pending ? "Checking…" : applied ? "Change" : "Apply"}
        </button>
      </div>

      {applied && (
        <p className="mt-2 rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          {applied.code} applied: {naira(applied.discount)} off
          {label ? `. ${label}.` : "."}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {perk && !applied && (
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setCode("");
          }}
          className="mt-2 text-sm font-medium text-brand underline underline-offset-2"
        >
          Never mind, keep the {naira(perk.discount)} off
        </button>
      )}
    </div>
  );
}
