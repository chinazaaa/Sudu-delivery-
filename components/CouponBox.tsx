"use client";

import { useActionState, useEffect } from "react";
import { tryCoupon, type CouponState } from "@/app/actions";
import { naira } from "@/lib/money";

/**
 * A code, checked before the order is placed. Typing one and finding out at
 * the end whether it worked is the wrong way round: the whole point of a code
 * is the number it takes off, so it says so before anybody commits.
 */
export default function CouponBox({
  batchId,
  cart,
  phone,
  onApplied,
}: {
  batchId: string;
  /** The cart as it will be posted: ids and quantities. */
  cart: string;
  phone: string;
  onApplied: (applied: { code: string; discount: number } | null) => void;
}) {
  const [state, action, pending] = useActionState<CouponState, FormData>(tryCoupon, {
    error: null,
    code: null,
    discount: 0,
    label: null,
  });

  useEffect(() => {
    onApplied(state.code ? { code: state.code, discount: state.discount } : null);
    // onApplied is a fresh closure each render; the result is what matters.
  }, [state.code, state.discount]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="border-t border-black/10 pt-2">
      {/* Its own form: checkout is a form already, and this must not place
          the order. */}
      <form id="coupon-check" action={action} className="hidden" />
      <input type="hidden" name="batch_id" value={batchId} form="coupon-check" />
      <input type="hidden" name="cart" value={cart} form="coupon-check" />
      <input type="hidden" name="phone" value={phone} form="coupon-check" />

      <label className="label" htmlFor="coupon">Discount code</label>
      <div className="flex gap-2">
        <input
          id="coupon"
          name="coupon"
          form="coupon-check"
          defaultValue={state.code ?? ""}
          placeholder="If you have one"
          autoCapitalize="characters"
          className="field uppercase grow py-2 text-sm"
        />
        <button
          type="submit"
          form="coupon-check"
          disabled={pending}
          className="btn-quiet shrink-0 px-4 py-2 text-sm"
        >
          {pending ? "Checking…" : state.code ? "Change" : "Apply"}
        </button>
      </div>

      {state.code && (
        <p className="mt-2 rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          {state.code} applied: {naira(state.discount)} off. {state.label}.
        </p>
      )}
      {state.error && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}
    </div>
  );
}
