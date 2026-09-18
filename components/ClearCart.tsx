"use client";

import { useEffect } from "react";
import { clearCart, clearPeople } from "@/lib/cart";
import { clearJoin } from "@/components/JoinDelivery";
import { leaveGroup } from "@/components/GroupLink";

/**
 * The cart lives in the browser, so the server redirect after checkout cannot
 * empty it. This does, once, on the confirmation page: the order is saved by
 * the time this page renders, so there is nothing left to lose.
 */
export default function ClearCart() {
  useEffect(() => {
    clearCart();
    clearPeople();
    // The friend's delivery has been joined now. Leaving it set would quietly
    // attach their next order to the same one, days later.
    clearJoin();
    leaveGroup();
  }, []);
  return null;
}
