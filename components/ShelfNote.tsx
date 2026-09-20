"use client";

import Link from "next/link";
import { naira } from "@/lib/money";
import { shelfCount, shelfTotal, useShelf } from "@/lib/skincare-cart";

/**
 * The skincare basket, seen from the food cart.
 *
 * They are two orders, on two days, and they stay apart. What they must not
 * be is invisible to each other: a basket you can only see by going back to
 * the shelf is one somebody leaves behind, and finds a week later.
 */
export default function ShelfNote({ when }: { when: string }) {
  const cart = useShelf();
  const count = shelfCount(cart);
  if (count === 0) return null;

  return (
    <Link
      href="/skincare/checkout"
      className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 transition active:scale-[0.99]"
    >
      <span>
        <span className="block font-bold text-brand-dark">
          {count} skincare item{count === 1 ? "" : "s"} waiting
        </span>
        <span className="block text-sm text-ink/75">
          {naira(shelfTotal(cart))}, coming {when}. It is its own order, so it
          does not touch the food below.
        </span>
      </span>
      <span className="shrink-0 text-sm font-extrabold text-brand-dark">Checkout</span>
    </Link>
  );
}
