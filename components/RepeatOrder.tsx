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
  carry,
  nothingLeft = "Nothing from this order is on the menu today.",
}: {
  lines: RepeatLine[];
  /** Items that cannot come back, each with the reason why. */
  blocked: RepeatBlock[];
  label?: string;
  /** Where to land: the cart to adjust it, or checkout to pick a run. */
  goTo?: "/cart" | "/checkout";
  note?: string;
  /** What they said last time and how they paid, carried into the checkout
   *  so the only thing left to do is press the button. */
  carry?: { note: string; method: "transfer" | "card" };
  /** What "there is nothing to put back" is called here. A cleanser is on a
   *  shelf, not a menu. */
  nothingLeft?: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (lines.length === 0) {
    return (
      <div className="text-sm text-muted">
        {blocked.length === 0 ? (
          <p>{nothingLeft}</p>
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
                containerPct: line.containerPct,
              },
              line.qty
            );
          }
          // Everything the checkout can fill in for them. Their name,
          // number and block are already kept on this device; what was not
          // carried was what they asked for last time and how they paid,
          // which is the difference between one press and filling a form
          // in again.
          if (carry) {
            try {
              const saved = JSON.parse(localStorage.getItem("sudu_me_v1") ?? "{}");
              localStorage.setItem(
                "sudu_me_v1",
                JSON.stringify({ ...saved, method: carry.method, note: carry.note })
              );
            } catch {
              /* Storage blocked. They type it again, as before. */
            }
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
