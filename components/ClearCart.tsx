"use client";

import { useEffect } from "react";
import { clearCart, clearPeople } from "@/lib/cart";

/**
 * The cart lives in the browser, so the server redirect after checkout cannot
 * empty it. This does, once, on the confirmation page: the order is saved by
 * the time this page renders, so there is nothing left to lose.
 */
export default function ClearCart() {
  useEffect(() => {
    clearCart();
    clearPeople();
  }, []);
  return null;
}
