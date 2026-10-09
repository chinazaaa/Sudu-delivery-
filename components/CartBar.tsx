"use client";

import Link from "next/link";
import { cartSubtotal, countItems, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";

/** The bar that follows you around once there is food in the cart. */
export default function CartBar() {
  const cart = useCart();
  const count = countItems(cart);
  if (count === 0) return null;

  // A basket keeps the price a thing had when it went in, so one saved while
  // a menu was half imported can still say nothing at all. The cart page puts
  // that right; until somebody opens it, a bar reading ₦0 looks either broken
  // or free, and both are worse than a bar that simply does not say.
  const subtotal = cartSubtotal(cart);

  // Whose food it is, the way the board writes it: "1 item · KFC", and the
  // count of kitchens once there is more than one, because naming the first
  // of three is worse than naming none.
  const places = Array.from(new Set(cart.map((l) => l.restaurantName).filter(Boolean)));
  const from =
    places.length === 1
      ? places[0]
      : places.length > 1
        ? `${places.length} kitchens`
        : "";

  return (
    /*
     * Only where nothing else carries the cart.
     *
     * On a phone the tab bar along the bottom already has a Cart tab with
     * the count on it, so this was a second cart control stacked on top of
     * the first, floating over whatever somebody was reading and covering
     * the button at the end of a section. One of the two had to go, and the
     * tab bar is the one that is always exactly where a thumb is.
     *
     * From sm up there is no tab bar, so this is the cart until a laptop,
     * where the header's own pill takes over.
     */
    <div className="fixed inset-x-4 bottom-4 z-30 hidden sm:block lg:hidden">
      <Link
        href="/cart"
        className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-brand py-2.5 pl-[18px] pr-2.5 text-white shadow-hard"
      >
        <span className="flex min-w-0 flex-col">
          <span className="ticket truncate text-[11px] text-white/90">
            {count} item{count === 1 ? "" : "s"}
            {from !== "" ? ` · ${from}` : ""}
          </span>
          {subtotal > 0 && (
            <span className="truncate text-lg font-bold leading-tight">
              {naira(subtotal)}
            </span>
          )}
        </span>
        <span className="flex min-h-11 shrink-0 items-center rounded-full bg-ink px-[18px] font-bold text-white">
          View cart
        </span>
      </Link>
    </div>
  );
}
