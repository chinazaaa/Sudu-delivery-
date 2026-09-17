"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addLine } from "@/lib/cart";
import type { RepeatLine } from "@/lib/orders";

/**
 * Puts an old order back in the cart at today's prices. Nothing is charged and
 * no details are asked for again: the cart is filled and the person carries on
 * from there, so a repeat is one tap rather than a form.
 */
export default function RepeatOrder({
  lines,
  missing,
  label = "Order this again",
}: {
  lines: RepeatLine[];
  /** Items from that order no longer on sale, named so nobody is surprised. */
  missing: string[];
  label?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing from this order is on the menu today.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn-quiet w-full py-2.5 text-sm"
        onClick={() => {
          for (const line of lines) {
            addLine(
              {
                itemId: line.itemId,
                optionIds: line.optionIds,
                name: line.name,
                restaurantId: line.restaurantId,
                restaurantName: line.restaurantName,
                imageUrl: line.imageUrl,
                unitPrice: line.unitPrice,
                choices: line.choices,
              },
              line.qty
            );
          }
          setDone(true);
          router.push("/cart");
        }}
      >
        {done ? "In your cart" : label}
      </button>
      {missing.length > 0 && (
        <p className="text-xs text-brand">
          {missing.join(", ")} {missing.length === 1 ? "is" : "are"} sold out
          today, so {missing.length === 1 ? "it is" : "they are"} left out.
        </p>
      )}
    </div>
  );
}
