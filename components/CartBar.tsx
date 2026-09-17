"use client";

import Link from "next/link";
import { cartSubtotal, countItems, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";

/** The bar that follows you around once there is food in the cart. */
export default function CartBar() {
  const cart = useCart();
  const count = countItems(cart);
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 p-3 sm:bottom-0">
      <Link
        href="/cart"
        className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-white shadow-lift"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 font-bold">
          {count}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">View cart</span>
          <span className="block truncate text-sm text-white/80">
            Delivery added at checkout
          </span>
        </span>
        <span className="shrink-0 font-bold">{naira(cartSubtotal(cart))}</span>
      </Link>
    </div>
  );
}
