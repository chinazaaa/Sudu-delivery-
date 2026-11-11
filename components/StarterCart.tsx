"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { addLine, lineKey, useCart } from "@/lib/cart";
import { setVia } from "@/lib/via";
import { missingFrom, type StarterLine } from "@/lib/starter-lines";

/**
 * Puts a starter cart's dishes into this browser's own cart, then opens it.
 *
 * Only what the cart lacks goes in, so opening the link twice does not
 * double anything, and nothing already there is touched.
 */
export default function StarterCart({ lines }: { lines: StarterLine[] }) {
  const router = useRouter();
  const cart = useCart();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    for (const line of missingFrom(lines, cart, (id, options) => lineKey(id, options, ""))) {
      addLine(
        {
          itemId: line.itemId,
          optionIds: line.optionIds,
          name: line.name,
          restaurantId: line.restaurantId,
          restaurantName: line.restaurantName,
          imageUrl: line.imageUrl,
          unitPrice: line.unitPrice,
          choices: line.choices,
          choiceFees: line.choiceFees,
          containerPct: line.containerPct,
        },
        line.qty,
        ""
      );
    }
    setVia("starter cart");
    router.replace("/cart");
    // Read once on arrival: the cart changing as it fills must not rerun this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <p className="py-16 text-center text-muted">Putting it in your cart…</p>;
}
