"use client";

import Link from "next/link";
import { naira } from "@/lib/money";
import { shelfCount, shelfTotal, useShelf } from "@/lib/skincare-cart";

/**
 * A counter's basket, seen from the food cart.
 *
 * They are separate orders, on separate days, and they stay apart. What they
 * must not be is invisible to each other: a basket you can only see by going
 * back to the shelf is one somebody leaves behind, and finds a week later.
 * One of these per counter, for exactly that reason.
 */
export default function ShelfNote({
  when,
  counter = "skincare",
  what = "skincare",
  href = "/skincare/checkout",
}: {
  when: string;
  /** Whose basket to read. */
  counter?: string;
  /** What to call the things in it. */
  what?: string;
  href?: string;
}) {
  const cart = useShelf(counter);
  const count = shelfCount(cart);
  if (count === 0) return null;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border-2 border-brand/30 bg-brand-tint px-4 py-3 transition active:scale-[0.99]"
    >
      <span>
        <span className="block font-bold text-brand-dark">
          {count} {what} item{count === 1 ? "" : "s"} waiting
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
