"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Carousel from "./Carousel";
import CountdownBanner from "./CountdownBanner";
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
  const cart = useCart();

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
        <p className="mt-1 text-sm text-ink/60">
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
            <div key={entry.restaurant.id} className="relative h-[260px] sm:h-[380px]">
              <Thumb
                src={entry.restaurant.bannerUrl}
                name={entry.restaurant.name}
                rounded="rounded-none"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-ink/15" />
              <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-10">
                <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
                  Sangotedo to PAU
                </span>
                <h2 className="max-w-md text-3xl font-extrabold leading-tight text-white sm:text-5xl">
                  {entry.restaurant.name}, delivered to your block.
                </h2>
                <p className="max-w-sm text-white/75">
                  {entry.items.length} item{entry.items.length === 1 ? "" : "s"} on the
                  menu. Kitchen closes {entry.restaurant.closesAt}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPlaceId(entry.restaurant.id);
                    setCategoryId(null);
                    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="btn w-fit bg-white px-6 py-3 text-ink hover:bg-white/90"
                >
                  See the menu
                </button>
              </div>
            </div>
          ))}
        </Carousel>
      </section>

      {promoter && (
        <p className="rounded-xl bg-brand-tint px-4 py-3 text-sm font-medium text-brand-dark">
          {promoter.name} sent you, so ₦500 comes off your first order.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["One payment", "Food and delivery together, paid once, before the run."],
          ["Mix restaurants", "KFC and Domino's in one cart, one delivery fee."],
          ["Refunds same night", "Wrong or missing item, money back that evening."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-2xl border border-black/5 bg-white p-4">
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-ink/55">{detail}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight">Shop by restaurant</h2>
          <span className="text-sm text-ink/50">{menu.length} open</span>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {menu.map((entry) => {
            const active = entry.restaurant.id === place.restaurant.id;
            const count = perRestaurant.get(entry.restaurant.id) ?? 0;
            return (
              <button
                key={entry.restaurant.id}
                type="button"
                onClick={() => {
                  setPlaceId(entry.restaurant.id);
                  setCategoryId(null);
                }}
                className={`relative w-40 shrink-0 overflow-hidden rounded-2xl border text-left transition ${
                  active ? "border-brand shadow-card" : "border-black/5 hover:shadow-card"
                }`}
              >
                <span className="block h-24">
                  <Thumb
                    src={entry.restaurant.bannerUrl || entry.restaurant.logoUrl}
                    name={entry.restaurant.name}
                    rounded="rounded-none"
                  />
                </span>
                <span className="block bg-white p-3">
                  <span className="block truncate font-semibold">
                    {entry.restaurant.name}
                  </span>
                  <span className="block text-xs text-ink/50">
                    closes {entry.restaurant.closesAt}
                  </span>
                </span>
                {count > 0 && (
                  <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section id="menu" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-extrabold tracking-tight">
            {place.restaurant.name}
          </h2>
          <p className="text-sm text-ink/55">
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

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} restaurant={place.restaurant} />
          ))}
          {items.length === 0 && (
            <p className="col-span-full text-sm text-ink/55">
              Nothing in this section yet.
            </p>
          )}
        </div>
      </section>

      {featured.length > 1 && (
        <section className="space-y-4">
          <h2 className="text-xl font-extrabold tracking-tight">Popular this week</h2>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
            {featured.map(({ item, place: from }) => (
              <div key={item.id} className="w-48 shrink-0">
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
              <p className="truncate text-xs text-ink/55">
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
