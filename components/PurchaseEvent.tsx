"use client";

import { useEffect } from "react";

/**
 * Telling Google that an order was paid for, once.
 *
 * Merchant Center counts a purchase against the product listing that was
 * clicked, which is the whole point of the tag: without this it knows the
 * click happened and nothing after it. The event carries the order's own
 * reference as the transaction id, so Google can tell two orders apart and,
 * more importantly, can tell the same order from itself.
 *
 * Fired from the browser rather than the server because the tag only exists
 * in the browser, and only on an order that has actually been paid for: an
 * order waiting on a transfer is not a sale, and plenty never become one.
 *
 * Counted once per order for as long as this browser remembers it. The
 * confirmation page is bookmarked, refreshed and reopened for days while
 * somebody watches their food, and every one of those would otherwise be
 * another sale as far as Google is concerned. A browser that has forgotten,
 * or refuses to remember, double-counts rather than losing it, which is the
 * right way round: a missing sale looks like a listing that does not work.
 */
export default function PurchaseEvent({
  reference,
  value,
  items,
}: {
  /** The order's own reference, which is what the shop calls it everywhere
   *  else and so what to look for when a number is questioned. Not called
   *  "ref": React still treats that name as its own on a component, and a
   *  prop that sometimes disappears is worse than a longer word. */
  reference: string;
  /** What was actually paid, delivery and any discount included. */
  value: number;
  items: { id: string; name: string; price: number; qty: number }[];
}) {
  useEffect(() => {
    const sent = `sudu.sold.${reference}`;
    try {
      if (window.localStorage.getItem(sent) === "1") return;
    } catch {
      // A browser with storage switched off still gets to tell Google.
    }

    const tag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof tag !== "function") return;

    tag("event", "purchase", {
      transaction_id: reference,
      value,
      currency: "NGN",
      items: items.map((one) => ({
        item_id: one.id,
        item_name: one.name,
        price: one.price,
        quantity: one.qty,
      })),
    });

    try {
      window.localStorage.setItem(sent, "1");
    } catch {
      /* Nothing to do about it, and nothing worth saying to anybody. */
    }
  }, [reference, value, items]);

  return null;
}
