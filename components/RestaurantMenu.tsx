"use client";

import { useState } from "react";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import CartBar from "./CartBar";
import { useCart } from "@/lib/cart";
import { CATEGORY_SEPARATOR } from "@/lib/menu-import";
import type { ItemView, MenuView } from "@/lib/view";

/** One restaurant's menu: sticky category tabs over a list of items. */
export default function RestaurantMenu({ place }: { place: MenuView }) {
  const [open, setOpen] = useState<ItemView | null>(null);
  const [top, setTop] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const cart = useCart();

  const needle = query.trim().toLowerCase();
  const found =
    needle.length >= 2
      ? place.items.filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle)
        )
      : null;

  const countFor = (itemId: string) =>
    cart.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);

  // Categories are stored as "Pizza · Veggie", which reads as a filter and a
  // sub-filter rather than thirty chips in a row.
  const split = (name: string) => {
    const [first, ...rest] = name.split(CATEGORY_SEPARATOR);
    return { top: first.trim(), sub: rest.join(CATEGORY_SEPARATOR).trim() };
  };

  const categories = place.categories.map((category) => ({
    ...category,
    ...split(category.name),
    items: place.items.filter((i) => i.categoryId === category.id),
  }));

  const tops: { name: string; count: number }[] = [];
  for (const category of categories) {
    const found = tops.find((t) => t.name === category.top);
    if (found) found.count += category.items.length;
    else tops.push({ name: category.top, count: category.items.length });
  }

  const subs = top
    ? categories.filter((c) => c.top === top && c.sub && c.items.length > 0)
    : [];

  const uncategorised = place.items.filter(
    (i) => !i.categoryId || !place.categories.some((c) => c.id === i.categoryId)
  );

  const shown = (() => {
    if (top === null) return place.items;
    const matching = categories.filter(
      (c) => c.top === top && (sub === null || c.sub === sub)
    );
    const ids = new Set(matching.map((c) => c.id));
    return place.items.filter((i) => i.categoryId && ids.has(i.categoryId));
  })();

  const sections =
    top === null && tops.length > 0
      ? [
          ...tops.map((t) => ({
            name: t.name,
            items: place.items.filter((i) => {
              const category = categories.find((c) => c.id === i.categoryId);
              return category?.top === t.name;
            }),
          })),
          { name: "More", items: uncategorised },
        ].filter((section) => section.items.length > 0)
      : [{ name: "", items: shown }];

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 space-y-2 border-b border-black/5 bg-shell/95 px-4 pb-1 pt-2 backdrop-blur">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${place.restaurant.name}`}
            aria-label={`Search ${place.restaurant.name}`}
            className="field py-3 pl-10"
          />
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            ⌕
          </span>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-bold text-muted"
            >
              Clear
            </button>
          )}
        </div>

        {tops.length > 0 && !found && (
          <>
          <div className="no-scrollbar flex gap-5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setTop(null);
                setSub(null);
              }}
              className={`shrink-0 whitespace-nowrap border-b-2 pb-2 pt-1 text-sm font-bold transition ${
                top === null
                  ? "border-brand text-brand"
                  : "border-transparent text-muted"
              }`}
            >
              All
            </button>

            {tops.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => {
                  setTop(entry.name);
                  setSub(null);
                }}
                className={`shrink-0 whitespace-nowrap border-b-2 pb-2 pt-1 text-sm font-bold transition ${
                  top === entry.name
                    ? "border-brand text-brand"
                    : "border-transparent text-muted"
                }`}
              >
                {entry.name}
              </button>
            ))}
          </div>

          {subs.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSub(null)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  sub === null ? "bg-black/[0.08] text-ink" : "text-muted"
                }`}
              >
                Any {(top ?? "").toLowerCase()}
              </button>
              {subs.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSub(category.sub)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${
                    sub === category.sub ? "bg-black/[0.08] text-ink" : "text-muted"
                  }`}
                >
                  {category.sub} {category.items.length}
                </button>
              ))}
            </div>
          )}
          </>
        )}
      </div>

      <div className="space-y-8 pb-28">
        {found && (
          <section className="space-y-3">
            <h2 className="section-title">
              {found.length} result{found.length === 1 ? "" : "s"}
            </h2>
            {found.length === 0 && (
              <p className="text-muted">
                Nothing here matches that. Try a shorter word.
              </p>
            )}
            {found.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                inCart={countFor(item.id)}
                onOpen={() => setOpen(item)}
              />
            ))}
          </section>
        )}

        {!found && sections.map((section) => (
          <section key={section.name || "all"} className="space-y-3">
            {section.name && <h2 className="section-title">{section.name}</h2>}
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
        {sections.length === 0 && (
          <p className="text-muted">Nothing on the menu here yet.</p>
        )}
      </div>

      {open && (
        <ItemSheet item={open} restaurant={place.restaurant} onClose={() => setOpen(null)} />
      )}

      <CartBar />
    </>
  );
}
