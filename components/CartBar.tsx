"use client";

import Link from "next/link";
import { cartSubtotal, cartCount, countItems, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";

/** The bar that follows you around once there is food in the cart. */
export default function CartBar() {
  const cart = useCart();
  const count = cartCount(cart);
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
    /*
     * A pill the width of its own words, not a bar the width of the page.
     *
     * This was a full-width card with a button bolted on the end, which is
     * a lot of furniture to say there are three things in a cart. Shrunk to
     * its contents and centred, it sits over the middle of the list and
     * leaves both edges of whatever is underneath readable.
     *
     * The figure says what it is. It is the food and nothing else: the fee
     * depends on the day and the block, neither of which has been chosen
     * yet, so a bare number here reads as a total and then grows by four
     * thousand at the checkout.
     */
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 hidden px-4 sm:block lg:hidden">
      <Link
        href="/cart"
        className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border-2 border-ink bg-ink py-2.5 pl-5 pr-2.5 text-white shadow-hard"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-bold leading-tight">View cart</span>
          {subtotal > 0 && (
            <span className="truncate text-xs leading-snug text-white/70">
              {naira(subtotal)} of food
              {from !== "" ? ` · ${from}` : ""}
            </span>
          )}
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-bold">
          {count}
        </span>
      </Link>
    </div>
  );
}
