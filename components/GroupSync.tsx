"use client";

import { useEffect, useRef, useState } from "react";
import { PARTY_CHANGED, readGroup } from "./GroupLink";
import { toServerLines, useCart } from "@/lib/cart";

/**
 * Keeps the car's view of this person's food up to date, from every page.
 *
 * Food is added on a menu page or in an item sheet, not on the cart page, so
 * a sync that only ran where the cart is shown would miss almost all of it.
 * This sits in the layout instead, next to the bar, and watches.
 *
 * A couple of seconds after the cart settles, not on every tap: somebody
 * pressing plus four times is one change, and the others are reading a list,
 * not a stopwatch.
 */
export default function GroupSync() {
  const cart = useCart();
  const [group, setGroup] = useState("");
  const last = useRef("");

  useEffect(() => {
    const read = () => setGroup(readGroup());
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  useEffect(() => {
    if (group === "") return;

    const lines = toServerLines(cart);
    const snapshot = JSON.stringify(lines);
    if (snapshot === last.current) return;

    const timer = setTimeout(() => {
      last.current = snapshot;
      // Nothing to tell anybody if it fails: their own cart is unaffected,
      // and the next change tries again.
      void fetch(`/api/party/${group}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      }).catch(() => {
        last.current = "";
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [cart, group]);

  return null;
}
