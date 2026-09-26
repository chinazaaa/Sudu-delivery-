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

/** One way into the shop: a card in the grid, and a slide in the slider. */
export type Bucket = {
  href: string;
  title: string;
  line: string;
  action: string;
  /** The picture on the card and on the slide. A shop with no pictures reads
   *  as a list of links, whatever is behind them. */
  image?: string;
};

export default function Home({
  menu,
  arriving,
  alsoArriving = null,
  buckets,
  slides,
  iosAppId = "",
}: {
  menu: MenuView[];
  /** When something ordered right now would land, said as a sentence and
   *  worked out on the server: a phone's own clock can be anything, and this
   *  is the same decision the checkout makes. Empty when nothing is going. */
  arriving: string;
  /** The other way of getting it here, for whoever the headline does not
   *  suit. Null when there is only one way. */
  alsoArriving?: { said: string; sooner: boolean } | null;
  /** Every way into the shop, in the order admin put them in: the grid, and
   *  the slider under it. Worked out on the server, because which of them
   *  are on, what each says and what order they go in are all the shop's
   *  business and none of the phone's. */
  buckets: Bucket[];
  /** Written in admin. Empty falls back to a slide per restaurant. */
  slides: Slide[];
  /** The App Store id, or empty where the shop has no app to mention. */
  iosAppId?: string;
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
      {/* One sentence, and nothing else, and first. Most people never
          scroll, so the first screen has to answer the only question a
          hungry person has, which is when they can eat. */}
      {arriving !== "" && <ArrivalStrip said={arriving} also={alsoArriving} />}

      {/* Above the restaurants, because by the time somebody is reading a
          menu they have already decided how they are ordering. */}
      <SplitPrompt />

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
            <div className="space-y-3">
              <p className="text-muted">
                Nothing matches that. Try a shorter word, like chicken or pizza.
              </p>
              {/* The best moment there is to offer this: somebody has just
                  told us exactly what they want and we have just told them
                  we do not have it. */}
              <Link
                href="/custom-order"
                className="block rounded-2xl bg-paper p-4 shadow-card"
              >
                <span className="block font-bold">
                  Still can&apos;t find it?
                </span>
                <span className="mt-1 block text-sm leading-snug text-muted">
                  Tell us what you are looking for and we will find it, price
                  it, and bring it to your block.
                </span>
                <span className="mt-2 block text-sm font-extrabold text-brand">
                  Ask us to get it
                </span>
              </Link>
            </div>
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
          {/* Everything the shop does that is not tonight's dinner, in one
              row you swipe rather than doors stacked down the page.

              Stacked, each new thing the shop started pushed the restaurants
              further down: occasions, then parcels, then skincare, and the menu
              began below three screens of doors. A row costs the same height
              whether there are two of these or five. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {buckets.map((one) => (
              <Door
                key={one.href}
                href={one.href}
                title={one.title}
                line={one.line}
                action={one.action}
                image={one.image ?? ""}
              />
            ))}
          </div>

          {/* Not a bucket: it is not a thing the shop sells, and standing it
              beside the ones that are made it compete with them. One line
              under the grid, for whoever is on the right phone. */}
          {iosAppId !== "" && (
            <p className="text-center text-sm text-muted">
              On an iPhone?{" "}
              <a
                href={`https://apps.apple.com/app/id${iosAppId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-brand underline"
              >
                Get the app
              </a>
            </p>
          )}

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
              : /* A slide a restaurant was the front page saying the shop is
                   a list of restaurants, which it stopped being. The slider
                   says the same seven things the grid does, big, for whoever
                   reads a picture before they read a card. Written in admin
                   still wins: a slide somebody wrote is always better than
                   one the page made up. */
                buckets.map((one) => ({
                  key: one.href,
                  image: one.image ?? "",
                  name: one.title,
                  headline: one.title,
                  body: one.line,
                  href: one.href,
                  linkText: one.action,
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

          {/* What this shop is, in the plainest words there are.
              At the foot on purpose: somebody who is here already knows, and
              the top of the page is for getting them fed. It is here for the
              ones who are not here yet, and for whatever is reading the page
              on their behalf, which needs the relationship between Sudu, PAU
              and its students said outright rather than inferred from a list
              of restaurants. */}
          <p className="pt-2 text-center text-sm leading-relaxed text-muted">
            Sudu delivers food, groceries, skincare and parcels to
            Pan-Atlantic University students. Order from your favourite
            restaurants around Sangotedo and Novare and get your order
            delivered directly to your PAU hostel.
          </p>
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

/**
 * One thing the shop does, as a card in a row.
 *
 * Narrow enough that the next one shows at the edge, because a row that
 * looks like it ends at the screen is a row nobody swipes.
 */
function Door({
  href,
  title,
  line,
  action,
  image = "",
  away = false,
}: {
  href: string;
  title: string;
  line: string;
  action: string;
  /** The picture at the top of the card. Empty falls back to a tint. */
  image?: string;
  /** Somewhere that is not this site. Link would try to route it. */
  away?: boolean;
}) {
  const look =
    "flex h-full flex-col rounded-2xl bg-paper p-3.5 shadow-card transition active:scale-[0.99]";

  // A badge, not a billboard. A picture the size of the card is a card you
  // scroll past two of, and the whole point of the grid is that the ways in
  // fit on one screen. Small enough to be a mark, big enough to tell the
  // buckets apart at a glance.
  const inside = (
    <>
      <span className="flex items-center gap-2.5">
        <span className="block size-11 shrink-0 overflow-hidden rounded-xl">
          <Thumb src={image} name={title} rounded="" variant="banner" />
        </span>
        <span className="min-w-0 font-extrabold leading-tight">{title}</span>
      </span>
      <span className="mt-2 line-clamp-2 block text-sm leading-snug text-muted">
        {line}
      </span>
      <span className="mt-auto pt-2 text-sm font-extrabold text-brand">{action}</span>
    </>
  );

  if (away) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={look}>
        {inside}
      </a>
    );
  }

  return (
    <Link href={href} className={look}>
      {inside}
    </Link>
  );
}
