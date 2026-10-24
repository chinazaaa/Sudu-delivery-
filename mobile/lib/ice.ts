import { useEffect } from "react";

import { cart, type Line } from "./store";
import type { Shop } from "./api";

/**
 * The bag of ice block, put in the cart by the shop rather than asked for.
 *
 * Ice cream bought at four and handed over at seven is soup. The route
 * already puts the counter last; the other half of the answer is a bag of
 * ice in the boot with it, and that is a real thing somebody buys and
 * pays for, so it is a line rather than a few hundred naira hidden inside
 * the price of a sundae.
 *
 * One bag whatever the order is: ten tubs and one tub need the same bag.
 * It is not optional, so it is not offered, and it leaves by itself when
 * the last thing needing it leaves.
 *
 * The order puts it on whatever the phone says, so a phone that cannot
 * see it quotes a total twelve hundred and fifty short of the bill, which
 * is the one thing a checkout must never do.
 */
export function useIceInCart(shop: Shop | null, lines: Line[]): void {
  useEffect(() => {
    const ice = shop?.ice ?? null;
    if (!ice) return;

    const wanted = new Set(shop?.needsIce ?? []);
    const onIce = lines.some((one) => wanted.has(one.itemId) && one.qty > 0);
    const bag = lines.find((one) => one.itemId === ice.itemId) ?? null;

    if (onIce && !bag) {
      void cart.add(
        {
          itemId: ice.itemId,
          name: ice.name,
          restaurant: ice.restaurantName,
          imageUrl: ice.imageUrl,
          unitPrice: ice.unitPrice,
          optionIds: [],
          choices: [],
          containerPct: ice.containerPct,
          // Nobody's in particular in a group cart: it is the boot's, not
          // a person's, and giving it to whoever was being shopped for
          // put a bag of ice in one friend's bag.
          forName: "",
        },
        1
      );
      return;
    }

    // More than one, because two people added ice cream at different
    // moments. One boot, one bag.
    if (bag && bag.qty > 1) {
      void cart.setQty(bag.key, 1);
      return;
    }

    if (!onIce && bag) void cart.setQty(bag.key, 0);
  }, [shop, lines]);
}
