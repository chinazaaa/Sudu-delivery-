"use client";

import Link from "next/link";
import { useState } from "react";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import CartBar from "./CartBar";
import { cartSubtotal, countItems, useCart } from "@/lib/cart";
import { CATEGORY_SEPARATOR } from "@/lib/menu-import";
import { bandFor, feeFor, type Band } from "@/lib/fees";
import { naira } from "@/lib/money";
import type { ItemView, MenuView } from "@/lib/view";

type Sort = "az" | "cheap" | "dear";

const SORTS: [Sort, string][] = [
  ["az", "A–Z"],
  ["cheap", "Cheapest"],
  ["dear", "Dearest"],
];

/**
 * One restaurant's menu, as the board draws it: category chips and a sort
 * over a grid of cards, with the run you are building beside them.
 */
export default function RestaurantMenu({
  place,
  bands,
}: {
  place: MenuView;
  /** The shop's own ladder, so the aside cannot quote a fee the checkout is
   *  not going to charge. */
  bands: Band[];
}) {
  const [open, setOpen] = useState<ItemView | null>(null);
  const [top, setTop] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("az");
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
    const already = tops.find((t) => t.name === category.top);
    if (already) already.count += category.items.length;
    else tops.push({ name: category.top, count: category.items.length });
  }

  const subs = top
    ? categories.filter((c) => c.top === top && c.sub && c.items.length > 0)
    : [];

  const shown = (() => {
    if (top === null) return place.items;
    const matching = categories.filter(
      (c) => c.top === top && (sub === null || c.sub === sub)
    );
    const ids = new Set(matching.map((c) => c.id));
    return place.items.filter((i) => i.categoryId && ids.has(i.categoryId));
  })();

  // Sorted, and sold-out last whichever sort it is: a shelf of things that
  // cannot be had is not the top of a menu.
  const order = (list: ItemView[]) =>
    [...list].sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (sort === "cheap") return a.price - b.price;
      if (sort === "dear") return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

  const list = order(found ?? shown);

  // The run, as it stands. Everything in the cart, not only this kitchen's:
  // the whole point is that they share one car.
  const count = countItems(cart);
  const subtotal = cartSubtotal(cart);
  const fee = count > 0 ? feeFor(count, null, bands) : 0;
  const band = bandFor(Math.max(count, 1), bands);
  const tier =
    band.maxItems === Infinity
      ? "top band"
      : `up to ${band.maxItems} item${band.maxItems === 1 ? "" : "s"}`;
  const room = band.maxItems === Infinity ? 0 : band.maxItems - count;

  const GRID = "grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3";

  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {/* Search, the chips and the sort. Sticky, because a menu is long
              and the way back to another category should not be a scroll to
              the top of the page. */}
          <div className="sticky top-[57px] z-20 -mx-4 flex flex-col gap-3 bg-shell/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-8 sm:px-8 md:top-[65px]">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${place.restaurant.name}`}
                aria-label={`Search ${place.restaurant.name}`}
                className="field rounded-full py-3 pl-11"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-4-4" />
                </svg>
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

            {!found && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {tops.length > 0 && (
                  <div
                    aria-label="Category"
                    className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setTop(null);
                        setSub(null);
                      }}
                      className={`chip ${top === null ? "chip-on" : "bg-transparent"}`}
                    >
                      Anything
                    </button>
                    {tops.map((entry) => (
                      <button
                        key={entry.name}
                        type="button"
                        onClick={() => {
                          setTop(entry.name);
                          setSub(null);
                        }}
                        className={`chip ${top === entry.name ? "chip-on" : "bg-transparent"}`}
                      >
                        {entry.name}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  aria-label="Sort"
                  className="flex w-full items-center gap-1 rounded-full border-2 border-ink bg-paper p-[3px] sm:w-auto"
                >
                  {SORTS.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSort(key)}
                      aria-pressed={sort === key}
                      className={`min-h-[38px] flex-1 rounded-full px-3.5 text-sm font-semibold transition sm:flex-none ${
                        sort === key ? "bg-ink text-white" : "text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!found && subs.length > 0 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setSub(null)}
                  className={`chip min-h-[38px] px-3.5 text-sm ${
                    sub === null ? "chip-on" : "bg-transparent"
                  }`}
                >
                  Any {(top ?? "").toLowerCase()}
                </button>
                {subs.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSub(category.sub)}
                    className={`chip min-h-[38px] px-3.5 text-sm ${
                      sub === category.sub ? "chip-on" : "bg-transparent"
                    }`}
                  >
                    {category.sub}
                  </button>
                ))}
              </div>
            )}
          </div>

          {found && (
            <h2 className="section-title">
              {found.length} result{found.length === 1 ? "" : "s"}
            </h2>
          )}

          {list.length === 0 ? (
            <p className="text-muted">
              {found
                ? "Nothing here matches that. Try a shorter word."
                : "Nothing on the menu here yet."}
            </p>
          ) : (
            <div className={`${GRID} pb-28 lg:pb-8`}>
              {list.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  inCart={countFor(item.id)}
                  restaurant={place.restaurant}
                  onOpen={() => setOpen(item)}
                />
              ))}
            </div>
          )}
        </div>

        {/* The run being built, beside the menu. On a phone this is the bar
            that floats at the bottom, which says the same three numbers in
            the space a phone has for them. */}
        <aside
          aria-label="Your run"
          className="sticky top-24 hidden w-[340px] shrink-0 overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[8px_8px_0_#15110e] lg:block"
        >
          <div className="flex items-baseline justify-between gap-3 bg-ink px-[22px] py-[18px] text-shell">
            <span className="font-display text-[30px] font-black uppercase leading-none">
              Your run
            </span>
            <span className="ticket text-volt">
              {count} item{count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex flex-col gap-3.5 px-[22px] py-5">
            {count === 0 ? (
              <p className="leading-relaxed text-muted">
                Nothing yet. Add from {place.restaurant.name}, or mix in any
                other kitchen. Same car, same fee.
              </p>
            ) : (
              <>
                {cart.map((line) => (
                  <div key={line.key} className="flex justify-between gap-3">
                    <span>
                      <span className="font-mono font-semibold">{line.qty}×</span>{" "}
                      {line.name}
                    </span>
                    <span className="whitespace-nowrap font-semibold">
                      {naira(line.unitPrice * line.qty)}
                    </span>
                  </div>
                ))}
                <div className="border-t-2 border-dashed border-line" />
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{naira(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Delivery <span className="text-muted">({tier})</span>
                  </span>
                  <span>{naira(fee)}</span>
                </div>
                {room > 0 && (
                  <p className="rounded-[10px] bg-brand-tint px-3 py-2.5 text-sm leading-snug">
                    {room} more item{room === 1 ? "" : "s"} fit
                    {room === 1 ? "s" : ""} in this fee, from any restaurant.
                  </p>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-display text-[40px] font-black leading-none">
                    {naira(subtotal + fee)}
                  </span>
                </div>
                <Link href="/cart" className="btn-primary w-full text-[17px]">
                  Checkout
                  <span aria-hidden>→</span>
                </Link>
                <Link href="/group" className="text-center font-semibold">
                  Invite friends to this run
                </Link>
              </>
            )}
          </div>
        </aside>
      </div>

      {open && (
        <ItemSheet item={open} restaurant={place.restaurant} onClose={() => setOpen(null)} />
      )}

      <CartBar />
    </>
  );
}
