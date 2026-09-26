"use client";

import { useEffect } from "react";

import { reprice } from "@/lib/cart";

/**
 * Brings a basket back in step with the menu, once, quietly.
 *
 * It runs where the cart is shown rather than everywhere: the point is that
 * nobody reads a wrong number and then meets the right one at the checkout,
 * and the cart is where that number is read.
 *
 * Nothing is announced. A price that has moved is simply the price, and a
 * notice saying so on a basket somebody forgot they had would be a thing to
 * worry about rather than a thing to know.
 */
export default function Reprice({
  itemPrice,
  optionDelta,
}: {
  itemPrice: Record<string, number>;
  optionDelta: Record<string, number>;
}) {
  useEffect(() => {
    reprice(itemPrice, optionDelta);
  }, [itemPrice, optionDelta]);

  return null;
}
