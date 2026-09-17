"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addLine } from "@/lib/cart";
import type { RepeatBlock, RepeatLine } from "@/lib/orders";

/**
 * Puts an old order back in the cart at today's prices. Nothing is charged and
 * no details are asked for again: the cart is filled and the person carries on
 * from there, so a repeat is one tap rather than a form.
 */
export default function RepeatOrder({
  lines,
  blocked,
  label = "Order this again",
  goTo = "/cart",
  note,
}: {
  lines: RepeatLine[];
  /** Items that cannot come back, each with the reason why. */
  blocked: RepeatBlock[];
  label?: string;
  /** Where to land: the cart to adjust it, or checkout to pick a run. */
  goTo?: "/cart" | "/checkout";
  note?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (lines.length === 0) {
    return (
      <div className="text-sm text-muted">
        {blocked.length === 0 ? (
          <p>Nothing from this order is on the menu today.</p>
        ) : (
          <ul className="space-y-0.5">
            {blocked.map((item) => (
              <li key={item.name}>
                {item.name} is {item.reason}.
              </li>
            ))}
          </ul>
        )}
      </div>
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
          router.push(goTo);
        }}
      >
        {done ? "In your cart" : label}
      </button>
      {note && <p className="text-xs text-muted">{note}</p>}
      {blocked.length > 0 && (
        <p className="text-xs text-brand">
          Left out:{" "}
          {blocked.map((item) => `${item.name} (${item.reason})`).join(", ")}.
        </p>
      )}
    </div>
  );
}
