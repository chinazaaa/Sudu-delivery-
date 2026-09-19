"use client";

import { useEffect } from "react";
import { clearCart, clearPeople } from "@/lib/cart";
import { rememberGroup } from "./GroupLink";

/**
 * Their food is in the group now, so the browser's cart is empty.
 *
 * Not the group itself, which is the difference from the one on the order
 * page: they are still in it, may well add a drink they forgot, and the bar
 * at the top should still say so.
 */
export default function ClearCartKeepGroup({
  /** The group their food came out of, kept so they can find the split
   *  again once the bar at the top has forgotten it. Only passed where an
   *  order actually exists. */
  remember = "",
}: {
  remember?: string;
}) {
  useEffect(() => {
    clearCart();
    clearPeople();
    if (remember !== "") rememberGroup(remember);
  }, [remember]);
  return null;
}
