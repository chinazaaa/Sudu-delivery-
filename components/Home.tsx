"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Carousel from "./Carousel";
import CartBar from "./CartBar";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import ArrivalStrip from "./ArrivalStrip";
import Thumb from "./Thumb";
import { useCart } from "@/lib/cart";
import SplitPrompt from "./SplitPrompt";
import type { ItemView, MenuView } from "@/lib/view";
import type { Slide } from "@/lib/slides";

export default function Home({
  menu,
  arriving,
  slides,
  popularIds,
  autoHeadline,
  autoLines,
  promos,
}: {
  menu: MenuView[];
  /** When something ordered right now would land, said as a sentence and
   *  worked out on the server: a phone's own clock can be anything, and this
   *  is the same decision the checkout makes. Empty when nothing is going. */
  arriving: string;
  /** Written in admin. Empty falls back to a slide per restaurant. */
  slides: Slide[];
  /** Menu item ids, most bought first. Empty until people have ordered. */
  popularIds: string[];
  /** The wording for the slider the page builds when there are no slides. */
  autoHeadline: string;
  autoLines: string[];
  /** A promotion on a restaurant, in a few words, keyed by its id. An offer
   *  announces itself on the card of the food it is for, because the front
   *  page has quite enough on it already. */
  promos: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<{ item: ItemView; place: MenuView } | null>(null);
  const cart = useCart();

  const countFor = (itemId: string) =>
    cart.filter((l) => l.itemId === itemId).reduce((n, l) => n + l.qty, 0);

  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return null;
    return menu.flatMap((place) =>
      place.items
        .filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.description.toLowerCase().includes(needle) ||
            place.restaurant.name.toLowerCase().includes(needle)
        )
        .map((item) => ({ item, place }))
    );
  }, [menu, query]);

  // What people actually bought, in that order. Until there is enough of
  // that, a few things from each menu, which is not the same claim.
  const { popular, measured } = useMemo(() => {
    const everything = menu.flatMap((place) =>
      place.items.filter((i) => i.available).map((item) => ({ item, place }))
    );

    const rank = new Map(popularIds.map((id, index) => [id, index]));
    const bought = everything
      .filter(({ item }) => rank.has(item.id))
      .sort((a, b) => (rank.get(a.item.id) ?? 0) - (rank.get(b.item.id) ?? 0));

    if (bought.length >= 3) return { popular: bought, measured: true };

    return {
      popular: menu.flatMap((place) =>
        place.items.filter((i) => i.available).slice(0, 3).map((item) => ({ item, place }))
      ),
      measured: false,
    };
  }, [menu, popularIds]);

  if (menu.length === 0) {
    return (
      <div className="card mx-auto mt-10 max-w-md text-center">
        <h2 className="font-bold">The menu is not up yet</h2>
        <p className="mt-1 text-sm text-muted">
          Watch the PAU WhatsApp group. The menu goes up on Monday.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* A time, not a timetable. Somebody opening a food shop wants to know
          when they can eat, and the run is a second answer to that which they
          find at checkout. Two stacked bars is also how the first restaurant
          ends up off the bottom of a short phone.
          The run strip is still the answer when there is no time to offer,
          because a page that says nothing about delivery is worse than one
          that says the wrong thing first. */}
      {/* Above the restaurants, because by the time somebody is reading a
          menu they have already decided how they are ordering. */}
      <SplitPrompt />

      {/* One sentence, and nothing else. Which run or which car it is has
          already been decided, by the same rule the checkout uses, so all
          that is left to say is when the food turns up. */}
      {arriving !== "" && <ArrivalStrip said={arriving} />}

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chicken, pizza, wings…"
          aria-label="Search the menu"
          className="field py-4 pl-11 text-base"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          ⌕
        </span>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-bold text-muted hover:bg-black/5"
          >
            Clear
          </button>
        )}
      </div>

      {found ? (
        <section className="space-y-3 pb-28">
          <h2 className="section-title">
            {found.length} result{found.length === 1 ? "" : "s"}
          </h2>
          {found.length === 0 ? (
            <p className="text-muted">
              Nothing matches that. Try a shorter word, like chicken or pizza.
            </p>
          ) : (
            found.map(({ item, place }) => (
              <ItemRow
                key={item.id}
                item={item}
                inCart={countFor(item.id)}
                onOpen={() => setOpen({ item, place })}
              />
            ))
          )}
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="section-title">Restaurants</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {menu.map((place) => (
                <Link
                  key={place.restaurant.id}
                  href={`/r/${place.restaurant.href}`}
                  className="group overflow-hidden rounded-2xl bg-paper shadow-card transition active:scale-[0.99]"
                >
                  <span className="block h-36 sm:h-40">
                    <Thumb
                      src={place.restaurant.bannerUrl || place.restaurant.logoUrl}
                      name={place.restaurant.name}
                      rounded="rounded-none"
                      variant={place.restaurant.bannerUrl ? "tile" : "banner"}
                    />
                  </span>
                  <span className="flex items-center gap-3 p-4">
                    <span className="size-12 shrink-0 overflow-hidden rounded-xl">
                      <Thumb
                        src={place.restaurant.logoUrl}
                        name={place.restaurant.name}
                        rounded="rounded-none"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-extrabold">
                        {place.restaurant.name}
                      </span>
                      {/* The price rather than a tease. "Promo inside" makes
                          somebody tap to find out whether it is worth
                          anything, and the number is the reason to tap. */}
                      {promos[place.restaurant.id] ? (
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-brand px-2.5 py-0.5 text-xs font-extrabold text-white">
                          {promos[place.restaurant.id]}
                        </span>
                      ) : (
                        <span className="block text-sm text-muted">
                          {place.items.length} item{place.items.length === 1 ? "" : "s"} on
                          the menu
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <Carousel>
            {(slides.length > 0
              ? slides.map((slide) => ({
                  key: slide.id,
                  image: slide.image_url,
                  name: slide.headline,
                  headline: slide.headline,
                  body: slide.body,
                  href: slide.link_url,
                  linkText: slide.link_text || "See the menu",
                }))
              : menu.map((place, index) => ({
                  key: place.restaurant.id,
                  image: place.restaurant.bannerUrl,
                  name: place.restaurant.name,
                  headline: autoHeadline.replace("{restaurant}", place.restaurant.name),
                  body: autoLines[index % autoLines.length] ?? "",
                  href: `/r/${place.restaurant.href}`,
                  linkText: "See the menu",
                }))
            ).map((slide) => (
              <div key={slide.key} className="relative h-52 sm:h-72 lg:h-80">
                <Thumb
                  src={slide.image}
                  name={slide.name}
                  rounded="rounded-none"
                  variant="banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/60 to-ink/20" />
                {/* Every line is clamped and the block is allowed to overflow
                    nowhere: a long restaurant name used to push the headline
                    out through the top of the slide and lose half of it. */}
                <div className="absolute inset-0 flex flex-col justify-end gap-2 overflow-hidden p-4 pb-11 text-white sm:gap-3 sm:p-8 sm:pb-14">
                  <h2 className="line-clamp-2 text-xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                    {slide.headline}
                  </h2>
                  {slide.body && (
                    <p className="line-clamp-2 max-w-md text-sm text-white/80 sm:text-base">
                      {slide.body}
                    </p>
                  )}
                  {slide.href && (
                    <Link
                      href={slide.href}
                      className="btn w-fit shrink-0 bg-paper px-5 py-2.5 text-sm text-ink sm:px-6 sm:py-3 sm:text-base"
                    >
                      {slide.linkText}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </Carousel>



          {popular.length > 0 && (
            <section className="space-y-3 pb-28">
              <h2 className="section-title">
                {measured ? "Popular this week" : "From the menu"}
              </h2>
              {popular.map(({ item, place }) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  inCart={countFor(item.id)}
                  onOpen={() => setOpen({ item, place })}
                />
              ))}
            </section>
          )}
        </>
      )}

      {open && (
        <ItemSheet
          item={open.item}
          restaurant={open.place.restaurant}
          onClose={() => setOpen(null)}
        />
      )}

      <CartBar />
    </div>
  );
}
