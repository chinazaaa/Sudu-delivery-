"use client";

import { useEffect } from "react";
import { clearCart, clearPeople } from "@/lib/cart";

/**
 * Their food is in the group now, so the browser's cart is empty.
 *
 * Not the group itself, which is the difference from the one on the order
 * page: they are still in it, may well add a drink they forgot, and the bar
 * at the top should still say so.
 */
export default function ClearCartKeepGroup() {
  useEffect(() => {
    clearCart();
    clearPeople();
  }, []);
  return null;
}
