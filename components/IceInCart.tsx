"use client";

import { useEffect } from "react";

import { addLine, lineKey, setQty, useCart } from "@/lib/cart";

/**
 * The bag of ice block, put in the cart by the shop rather than asked for.
 *
 * Ice cream bought at four and handed over at seven is soup. The route
 * already puts the counter last; the other half of the answer is a bag of
 * ice block in the boot with it, and that is a real thing somebody buys
 * and pays for, so it is a line rather than a few hundred naira hidden
 * inside the price of a sundae.
 *
 * One bag whatever the order is: ten tubs and one tub need the same bag.
 * It is not optional, so it is not offered, and it leaves by itself when
 * the last thing needing it leaves, because a bag of ice on an order of
 * pizzas is money nobody owes.
 *
 * Mounted wherever the cart is read, so the figure on the cart, the
 * figure at the checkout and the figure on the bill are one figure. The
 * server puts it on the order as well and does not trust this: a cart is
 * written on a phone and a phone can say anything.
 */
export default function IceInCart({
  ice,
  needsIce,
}: {
  /** The item that is the bag, as the cart needs it. Null where the shop
   *  has not said which item it is, and then nothing is ever added. */
  ice: {
    itemId: string;
    name: string;
    restaurantId: string;
    restaurantName: string;
    imageUrl: string;
    unitPrice: number;
    containerPct: number;
  } | null;
  /** The items that have to travel on ice, by id. */
  needsIce: string[];
}) {
  const cart = useCart();

  useEffect(() => {
    if (!ice) return;

    const wanted = new Set(needsIce);
    const onIce = cart.some((line) => wanted.has(line.itemId) && line.qty > 0);
    const bag = cart.find((line) => line.itemId === ice.itemId) ?? null;

    if (onIce && !bag) {
      addLine(
        {
          itemId: ice.itemId,
          optionIds: [],
          name: ice.name,
          restaurantId: ice.restaurantId,
          restaurantName: ice.restaurantName,
          imageUrl: ice.imageUrl,
          unitPrice: ice.unitPrice,
          choices: [],
          containerPct: ice.containerPct,
        },
        1,
        // Nobody's in particular in a group cart: it is the boot's, not a
        // person's, and giving it to whoever was being shopped for put a
        // bag of ice in one friend's bag.
        ""
      );
      return;
    }

    // More than one, because two people added ice cream at different
    // moments. One boot, one bag.
    if (bag && bag.qty > 1) {
      setQty(bag.key, 1);
      return;
    }

    if (!onIce && bag) setQty(bag.key, 0);
  }, [cart, ice, needsIce]);

  return null;
}

/** The key the bag sits under, for anything that has to leave it alone. */
export function iceKey(itemId: string): string {
  return lineKey(itemId, [], "");
}
