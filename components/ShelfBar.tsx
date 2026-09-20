"use client";

import Link from "next/link";
import { naira } from "@/lib/money";
import { feeFor, type Band } from "@/lib/fees";
import { shelfCount, shelfTotal, useShelf } from "@/lib/skincare-cart";

/**
 * What is in the skincare basket, and the way out of it.
 *
 * Its own bar, because its own basket: the food bar is about a car going this
 * afternoon and this one is about a car going on Saturday, and one bar trying
 * to say both says neither.
 */
export default function ShelfBar({ bands, when }: { bands: Band[]; when: string }) {
  const cart = useShelf();
  const count = shelfCount(cart);
  if (count === 0) return null;

  const food = shelfTotal(cart);
  // The ladder, worked out here rather than quoted as a "from": by the time
  // somebody has a basket, the real number is knowable and a number they
  // will be charged beats a number they might be.
  const fee = feeFor(count, null, bands);

  return (
    <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 sm:bottom-3">
      <Link
        href="/skincare/checkout"
        className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-brand px-4 py-3 text-white shadow-bar"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 font-bold">
            {count}
          </span>
          <span>
            <span className="block font-extrabold">Checkout</span>
            <span className="block text-xs text-white/80">
              Comes {when}
              {fee > 0 && ` · ${naira(fee)} delivery`}
            </span>
          </span>
        </span>
        <span className="font-extrabold">{naira(food + fee)}</span>
      </Link>
    </div>
  );
}
