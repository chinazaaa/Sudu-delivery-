"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Carousel from "./Carousel";
import CountdownBanner from "./CountdownBanner";
import PeopleBar from "./PeopleBar";
import ProductCard from "./ProductCard";
import Thumb from "./Thumb";
import { cartSubtotal, countItems, useCart } from "@/lib/cart";
import { naira } from "@/lib/money";
import type { BatchView, MenuView } from "@/lib/view";

export default function Storefront({
  menu,
  promoter,
  nextRun,
  initialRestaurantId,
}: {
  menu: MenuView[];
  promoter: { code: string; name: string } | null;
  nextRun: BatchView | null;
  initialRestaurantId?: string;
}) {
  const [placeId, setPlaceId] = useState(
    initialRestaurantId ?? menu[0]?.restaurant.id ?? ""
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const cart = useCart();

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return null;
    return menu.flatMap((entry) =>
      entry.items
        .filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle) ||
            entry.restaurant.name.toLowerCase().includes(needle)
        )
        .map((item) => ({ item, restaurant: entry.restaurant }))
    );
  }, [menu, query]);

  const place = menu.find((m) => m.restaurant.id === placeId) ?? menu[0];

  const perRestaurant = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of cart) {
      counts.set(line.restaurantId, (counts.get(line.restaurantId) ?? 0) + line.qty);
    }
    return counts;
  }, [cart]);

  if (menu.length === 0 || !place) {
    return (
      <div className="card mx-auto mt-10 max-w-md text-center">
        <h2 className="font-semibold">The menu is not up yet</h2>
        <p className="mt-1 text-sm text-muted">
          Watch the PAU WhatsApp group. The menu goes up on Monday.
        </p>
      </div>
    );
  }

  const items = place.items.filter(
    (item) => categoryId === null || item.categoryId === categoryId
  );
  const featured = menu.flatMap((m) =>
    m.items.filter((i) => i.imageUrl && i.available).slice(0, 1).map((i) => ({ item: i, place: m }))
  );

  return (
    <div className="space-y-10">
      {nextRun && (
        <CountdownBanner
          label={`${nextRun.label} batch`}
          cutOffISO={nextRun.cutOffISO}
          cutOffLabel={nextRun.cutOffLabel}
          deliveryWindow={nextRun.deliveryWindow}
          flashFee={nextRun.flashFee}
          flashReason={nextRun.flashReason}
        />
      )}

      <section>
        <Carousel>
          {menu.map((entry) => (
            <div key={entry.restaurant.id} className="relative h-[380px] sm:h-[420px]">
              <Thumb
                src={entry.restaurant.bannerUrl}
                name={entry.restaurant.name}
                rounded="rounded-none"
                variant="banner"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/15" />
              <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 pb-12 sm:justify-center sm:p-10 sm:pb-10">
                <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
                  Sangotedo to PAU
                </span>
                <h2 className="max-w-md text-2xl font-extrabold leading-tight text-white sm:text-5xl">
                  {entry.restaurant.name}, delivered to your block.
                </h2>
                <p className="max-w-sm text-sm text-white/75 sm:text-base">
                  {entry.items.length} item{entry.items.length === 1 ? "" : "s"} · kitchen
                  closes {entry.restaurant.closesAt}
                </p>
                <Link
                  href={`/r/${entry.restaurant.id}`}
                  className="btn w-fit bg-white px-6 py-3 text-ink hover:bg-white/90"
                >
                  See the menu
                </Link>
              </div>
            </div>
          ))}
        </Carousel>
      </section>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chicken, pizza, wings…"
          aria-label="Search the menu"
          className="field py-4 pl-12 text-base"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted">
          ⌕
        </span>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-semibold text-muted hover:bg-black/5"
          >
            Clear
          </button>
        )}
      </div>

      {found && (
        <section className="space-y-4">
          <h2 className="section-title">
            {found.length} result{found.length === 1 ? "" : "s"} for “{query.trim()}”
          </h2>
          {found.length === 0 ? (
            <p className="text-muted">
              Nothing matches that. Try a shorter word, like chicken or pizza.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
              {found.map(({ item, restaurant }) => (
                <ProductCard key={item.id} item={item} restaurant={restaurant} />
              ))}
            </div>
          )}
        </section>
      )}

      {promoter && (
        <p className="rounded-xl bg-brand-tint px-4 py-3 text-sm font-medium text-brand-dark">
          {promoter.name} sent you, so ₦500 comes off your first order.
        </p>
      )}

      {!found && (
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["One payment", "Food and delivery together, paid once, before the run."],
          ["Mix restaurants", "KFC and Domino's in one cart, one delivery fee."],
          ["Refunds same night", "Wrong or missing item, money back that evening."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-2xl border border-black/5 bg-white p-4">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted">{detail}</p>
          </div>
        ))}
      </section>
      )}

      {!found && (
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="section-title">Shop by restaurant</h2>
          <span className="text-sm text-muted">{menu.length} open</span>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {menu.map((entry) => {
            const active = entry.restaurant.id === place.restaurant.id;
            const count = perRestaurant.get(entry.restaurant.id) ?? 0;
            return (
              <Link
                key={entry.restaurant.id}
                href={`/r/${entry.restaurant.id}`}
                className={`relative block w-60 shrink-0 overflow-hidden rounded-2xl border-2 text-left transition sm:w-72 ${
                  active
                    ? "border-brand shadow-card"
                    : "border-transparent shadow-card hover:-translate-y-0.5"
                }`}
              >
                <span className="block h-36 sm:h-44">
                  <Thumb
                    src={entry.restaurant.bannerUrl || entry.restaurant.logoUrl}
                    name={entry.restaurant.name}
                    rounded="rounded-none"
                    variant={entry.restaurant.bannerUrl ? "tile" : "banner"}
                  />
                </span>
                <span className="block bg-white p-4">
                  <span className="block truncate text-lg font-bold">
                    {entry.restaurant.name}
                  </span>
                  <span className="block text-sm text-muted">
                    {entry.items.length} item{entry.items.length === 1 ? "" : "s"} · closes{" "}
                    {entry.restaurant.closesAt}
                  </span>
                </span>
                {count > 0 && (
                  <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>
      )}

      <PeopleBar />

      {!found && (
      <section id="menu" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title">{place.restaurant.name}</h2>
          <p className="text-sm text-muted">
            Mix restaurants in one order. One delivery fee either way.
          </p>
        </div>

        {place.categories.length > 0 && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`chip ${
                categoryId === null ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
              }`}
            >
              All
            </button>
            {place.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={`chip ${
                  categoryId === category.id
                    ? "border-ink bg-ink text-white"
                    : "border-black/10 bg-white"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} restaurant={place.restaurant} />
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-sm text-muted">
              Nothing in this section yet.
            </p>
          )}
        </div>
      </section>
      )}

      {!found && featured.length > 1 && (
        <section className="space-y-4">
          <h2 className="section-title">Popular this week</h2>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {featured.map(({ item, place: from }) => (
              <div key={item.id} className="w-60 shrink-0">
                <ProductCard item={item} restaurant={from.restaurant} />
              </div>
            ))}
          </div>
        </section>
      )}

      {countItems(cart) > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/95 p-3 backdrop-blur shadow-bar">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {countItems(cart)} item{countItems(cart) === 1 ? "" : "s"} ·{" "}
                {naira(cartSubtotal(cart))}
              </p>
              <p className="truncate text-xs text-muted">
                Delivery added at checkout, by size of order
              </p>
            </div>
            <Link href="/checkout" className="btn-primary shrink-0 px-6 py-2.5">
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
