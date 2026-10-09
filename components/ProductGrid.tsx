"use client";

import { useState } from "react";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import { useCart } from "@/lib/cart";
import type { ItemView, MenuView } from "@/lib/view";

/**
 * The grid on "every menu in one list".
 *
 * The same card the restaurant pages use, so a dish looks like itself
 * wherever somebody meets it, with the kitchen named on the card because
 * here it is the one thing that is not obvious.
 */
export default function ProductGrid({
  items,
}: {
  items: {
    item: ItemView;
    restaurant: MenuView["restaurant"];
    /** What the menu files it under, for the drawing on a card with no
     *  photograph. */
    category?: string;
  }[];
}) {
  const [open, setOpen] = useState<{
    item: ItemView;
    restaurant: MenuView["restaurant"];
  } | null>(null);
  const cart = useCart();

  const countFor = (itemId: string) =>
    cart.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(({ item, restaurant, category }) => (
          <li key={item.id} className="flex flex-col">
            <span className="ticket mb-1.5 block text-brand-dark">
              {restaurant.name}
            </span>
            <span className="flex-1">
              <ItemRow
                item={item}
                inCart={countFor(item.id)}
                restaurant={restaurant}
                category={category ?? ""}
                onOpen={() => setOpen({ item, restaurant })}
              />
            </span>
          </li>
        ))}
      </ul>

      {open && (
        <ItemSheet
          item={open.item}
          restaurant={open.restaurant}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
