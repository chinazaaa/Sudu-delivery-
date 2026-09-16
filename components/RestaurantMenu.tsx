"use client";

import { useState } from "react";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import CartBar from "./CartBar";
import { useCart } from "@/lib/cart";
import type { ItemView, MenuView } from "@/lib/view";

/** One restaurant's menu: sticky category tabs over a list of items. */
export default function RestaurantMenu({ place }: { place: MenuView }) {
  const [open, setOpen] = useState<ItemView | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const cart = useCart();

  const countFor = (itemId: string) =>
    cart.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);

  const sections = [
    ...place.categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: place.items.filter((i) => i.categoryId === category.id),
    })),
    {
      id: "other",
      name: place.categories.length > 0 ? "More" : "Menu",
      items: place.items.filter(
        (i) => !i.categoryId || !place.categories.some((c) => c.id === i.categoryId)
      ),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <>
      {sections.length > 1 && (
        <div className="sticky top-[60px] z-20 -mx-4 bg-shell/95 px-4 py-2 backdrop-blur sm:top-[68px]">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={`chip ${
                filter === null ? "border-ink bg-ink text-white" : "border-black/10 bg-paper"
              }`}
            >
              All
              <span className={filter === null ? "text-white/60" : "text-muted"}>
                {place.items.length}
              </span>
            </button>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setFilter(section.id)}
                className={`chip ${
                  filter === section.id
                    ? "border-ink bg-ink text-white"
                    : "border-black/10 bg-paper"
                }`}
              >
                {section.name}
                <span className={filter === section.id ? "text-white/60" : "text-muted"}>
                  {section.items.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-8 pb-28">
        {sections
          .filter((section) => filter === null || section.id === filter)
          .map((section) => (
          <section key={section.id} className="space-y-3">
            {sections.length > 1 && <h2 className="section-title">{section.name}</h2>}
            <div className="space-y-3">
              {section.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  inCart={countFor(item.id)}
                  onOpen={() => setOpen(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {open && (
        <ItemSheet item={open} restaurant={place.restaurant} onClose={() => setOpen(null)} />
      )}

      <CartBar />
    </>
  );
}
