"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Carousel from "./Carousel";
import CartBar from "./CartBar";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import ArrivalStrip from "./ArrivalStrip";
import Thumb from "./Thumb";
import { FOOD_KINDS, kindHref } from "@/lib/food-kinds";
import TrustStrip from "./TrustStrip";
import { naira } from "@/lib/money";
import { useCart } from "@/lib/cart";
import SplitPrompt from "./SplitPrompt";
import type { ItemView, MenuView } from "@/lib/view";
import type { Slide } from "@/lib/slides";

/** One way into the shop: a card in the grid, and a slide in the slider. */
export type Bucket = {
  href: string;
  title: string;
  line: string;
  /** The picture on the card. A shop with no pictures reads as a list of
   *  links, whatever is behind them. */
  image?: string;
};

/** The first few kitchens, for the sentence under the headline. Read off
 *  the menu, so a restaurant that comes off the shop comes off the page. */
const said = (menu: MenuView[]): string => {
  const names = menu.slice(0, 3).map((one) => one.restaurant.name);
  if (names.length === 0) return "Restaurants";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

export default function Home({
  menu,
  arriving,
  alsoArriving = null,
  closesAt = "",
  buckets,
  packs = [],
  slides,
  iosAppId = "",
  androidPackage = "",
  pitch = "",
  fees = [],
  areaExtras = [],
}: {
  menu: MenuView[];
  /** When something ordered right now would land, said as a sentence and
   *  worked out on the server: a phone's own clock can be anything, and this
   *  is the same decision the checkout makes. Empty when nothing is going. */
  arriving: string;
  /** When the run named above stops taking orders. Empty for a car of its
   *  own, which is not a queue anybody has to make. */
  closesAt?: string;
  /** The other way of getting it here, for whoever the headline does not
   *  suit. Null when there is only one way. */
  alsoArriving?: { said: string; sooner: boolean } | null;
  /** Every way into the shop, in the order admin put them in: the grid, and
   *  the slider under it. Worked out on the server, because which of them
   *  are on, what each says and what order they go in are all the shop's
   *  business and none of the phone's. */
  buckets: Bucket[];
  /** Every packed box by name, so a search for "care" finds the care
   *  package. The menu alone would say nothing matches. */
  packs?: { title: string; line: string; href: string }[];
  /** Written in admin. Empty falls back to a slide per restaurant. */
  slides: Slide[];
  /** The App Store id, or empty where the shop has no app to mention. */
  iosAppId?: string;
  androidPackage?: string;
  /** Why a stranger should hand over sixteen thousand naira before anything
   *  arrives. Written in admin; empty means the page says nothing, which is
   *  better than the page inventing something. */
  pitch?: string;
  /** The delivery ladder as the shop has it set, so the page cannot quote a
   *  fee the checkout is not going to charge. */
  fees?: { label: string; fee: number; each?: number }[];
  /** What going further out adds, named. Empty where everything is one
   *  area, which is what it was before areas existed. */
  areaExtras?: { name: string; extra: number }[];
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

  // The rest of the shop, searched too. Somebody typing "parcel" or "care"
  // is not asking the menu a question, and a search that only reads the menu
  // answers them with "nothing matches that", which is a lie.
  const elsewhere = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    const hay = [
      ...buckets.map((one) => ({
        title: one.title,
        line: one.line,
        href: one.href,
      })),
      ...packs,
    ];
    const seen = new Set<string>();
    return hay.filter((one) => {
      const key = `${one.title}|${one.href}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return (
        one.title.toLowerCase().includes(needle) ||
        one.line.toLowerCase().includes(needle)
      );
    });
  }, [buckets, packs, query]);

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
      {/* What the shop is, before what it is doing tonight.

          The page used to open on the run, which answers "when can I eat"
          for somebody who already knows what Sudu is, and says nothing at
          all to the half of the campus who have been sent a link. The
          headline is the promise in four words, and the run is directly
          under it. */}
      <section className="space-y-4 pt-2">
        <span className="ticket inline-block border-2 border-ink px-2 py-1">
          On PAU campus since 2018
        </span>
        <h1 className="font-display text-[clamp(3.5rem,16vw,5.5rem)] font-black uppercase leading-[0.86]">
          Outside food.
          <br />
          <span className="text-brand">Inside PAU.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ink/80">
          {menu.length > 0
            ? `${said(menu)} and more. Mix restaurants, pay once, collect at your hostel block.`
            : "Mix restaurants, pay once, collect at your hostel block."}
        </p>
        <Link href="/products" className="btn-primary w-full text-lg sm:w-auto">
          Start an order
          <span aria-hidden>→</span>
        </Link>
      </section>

      {arriving !== "" && (
        <ArrivalStrip said={arriving} also={alsoArriving} closesAt={closesAt} />
      )}

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
          {/* What the shop has, before what the kitchens have. Somebody
              searching "care" wants the care package, and burying it under
              forty dishes is the same as not having it. */}
          {elsewhere.length > 0 && (
            <ul className="space-y-2">
              {elsewhere.map((one) => (
                <li key={`${one.title}|${one.href}`}>
                  <Link
                    href={one.href}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-paper p-3.5 shadow-card"
                  >
                    <span className="min-w-0">
                      <span className="block font-bold leading-tight">
                        {one.title}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-sm text-muted">
                        {one.line}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-muted">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-title">
            {found.length} result{found.length === 1 ? "" : "s"} on the menu
          </h2>
          {found.length === 0 ? (
            <div className="space-y-3">
              {elsewhere.length === 0 && (
                <p className="text-muted">
                  Nothing matches that. Try a shorter word, like chicken or
                  pizza.
                </p>
              )}
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
          {/* The restaurants, by their own logos, before anything else.

              The page named none of them. A shop whose whole promise is
              "Domino's, to your hostel" opened on a search box and a card
              saying "Food", and the one thing that does the persuading — a
              logo somebody already trusts, already knows the prices of and
              already wants — was two taps away behind a category name. A
              student does not arrive wanting food in general. They arrive
              wanting KFC.

              A row rather than a grid: it costs one line of height whatever
              happens, and the one falling off the right edge is what says
              there are more. */}
          {/* The kitchens, named.

              A logo is what somebody recognises, and a row of them is what
              this was; the canvas asks for the names set in the display
              face, two up, which says thirteen of them in the space a
              scrolling row said five. The last tile carries the rest. */}
          {menu.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <h2 className="section-title">
                  {menu.length} kitchen{menu.length === 1 ? "" : "s"}.
                  <br />
                  One run.
                </h2>
                <Link
                  href="/products"
                  className="shrink-0 pb-1 text-sm font-extrabold text-ink underline"
                >
                  See all
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-2">
                {menu.slice(0, 5).map((place) => (
                  <li key={place.restaurant.id}>
                    <Link
                      href={`/r/${place.restaurant.href}`}
                      className="flex min-h-[72px] items-center rounded-[10px] border-2 border-ink bg-paper px-3.5 py-4 font-display text-2xl font-extrabold uppercase leading-[0.95]"
                    >
                      {place.restaurant.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/products"
                    className="flex min-h-[72px] items-center rounded-[10px] border-2 border-ink bg-brand px-3.5 py-4 font-display text-2xl font-extrabold uppercase leading-[0.95] text-white"
                  >
                    {menu.length > 5 ? `+ ${menu.length - 5} more` : "All the food"}
                  </Link>
                </li>
              </ul>
            </section>
          )}

          {/* What they came wanting, rather than who sells it.

              The row above answers "I want KFC", which is half the people
              who open this page. The other half have decided they want rice
              and do not care whose, and for them the page was a search box,
              which is a question rather than an answer. One tap lands them
              on the everything list, already narrowed.

              A row rather than a grid, for the same reason the restaurants
              are: it costs one line of height whatever is in it, and the
              one falling off the right edge is what says there are more. */}
          <section className="-mx-4 space-y-3 px-4">
            <h2 className="section-title">What are you after?</h2>
            <ul className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FOOD_KINDS.map((kind, at) => (
                <li key={kind.label} className="snap-start">
                  <Link
                    href={kindHref(kind)}
                    className={`chip ${at === 0 ? "chip-on" : "bg-paper"}`}
                  >
                    {kind.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Seven years on one campus and an award from the school
              itself, said on the page people actually open.

              It was on /about, which is a page nobody opens. The single
              hardest thing this shop asks of a first-time customer is money
              up front for food that has not been bought yet, and the answer
              to that was filed behind a link in the footer. */}
          <TrustStrip pitch={pitch} />

          {/* Under the food rather than over it. Splitting a delivery is a
              way of paying, and it was standing between somebody who came
              here hungry and the first picture of anything to eat. */}
          <SplitPrompt />

          {/* A line over the grid, and the way to the whole shelf on the
              right of it. The grid only names six collections, and somebody
              who wants the seventh should not have to guess there is one. */}
          <div className="flex items-end justify-between gap-3">
            <h2 className="section-title">Not just food</h2>
            <Link
              href="/collections"
              className="shrink-0 pb-1 text-sm font-extrabold text-ink underline"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {buckets.map((one) => (
              <Door
                key={one.href}
                href={one.href}
                title={one.title}
                line={one.line}
                image={one.image ?? ""}
              />
            ))}
          </div>

          {/* Not a bucket: it is not a thing the shop sells, and standing it
              beside the ones that are made it compete with them. One line
              under the grid, for whoever is on the right phone. */}
          {/* One link for both phones now. Naming one of them was right
              while there was one app and is a way of telling half the
              campus the shop is not for them. */}
          {(iosAppId !== "" || androidPackage !== "") && (
            <p className="text-center text-sm text-muted">
              {iosAppId !== "" && androidPackage !== ""
                ? "On iPhone or Android? "
                : iosAppId !== ""
                  ? "On an iPhone? "
                  : "On Android? "}
              <a href="/app" className="font-bold text-brand-dark underline">
                Get the app
              </a>
            </p>
          )}

          {/* What carrying it costs, before anybody has to reach a
              checkout to find out.

              The numbers are the shop's own ladder rather than a table
              written here: a page quoting four thousand over a checkout
              about to charge six is worse than a page that says nothing.
              It is the question every first-time customer asks, and it was
              answered nowhere on the page they ask it on. */}
          {fees.length > 0 && (
            <section className="space-y-3">
              <h2 className="section-title">One fee per car</h2>
              <div className="overflow-hidden rounded-xl border-2 border-ink bg-paper">
                <table className="w-full border-collapse">
                  <tbody>
                    {fees.map((row) => (
                      <tr key={row.label} className="border-b border-line last:border-0">
                        <th scope="row" className="p-3.5 text-left font-medium">
                          {row.label}
                        </th>
                        <td className="p-3.5 text-right">
                          <span className="font-display text-2xl font-extrabold">
                            {naira(row.fee)}
                          </span>
                          {row.each ? (
                            <span className="block text-xs text-muted">
                              + {naira(row.each)}/item
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {areaExtras.map((one) => (
                      <tr key={one.name} className="border-b border-line bg-brand-tint last:border-0">
                        <th scope="row" className="p-3.5 text-left font-medium">
                          {one.name}
                        </th>
                        <td className="p-3.5 text-right font-display text-2xl font-extrabold">
                          + {naira(one.extra)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-ink/75">
                Order with roommates on the same run and split one fee.
              </p>
            </section>
          )}

          {/* Only ever slides somebody wrote.

              It used to fall back to the buckets, which meant the bottom of
              the page was the grid again, big, over a placeholder gradient,
              under a row of text links that were the grid a third time. Three
              goes at the same six destinations in three different shapes is
              why the page stopped flowing where the food ended. A slider with
              nothing of its own to say is not a slider. */}
          {slides.length > 0 && (
          <Carousel>
              {slides
                .map((slide) => ({
                  key: slide.id,
                  image: slide.image_url,
                  name: slide.headline,
                  headline: slide.headline,
                  body: slide.body,
                  href: slide.link_url,
                  linkText: slide.link_text || "See the menu",
                }))
                .map((slide) => (
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
          )}

          {/* What this shop is, in the plainest words there are.
              At the foot on purpose: somebody who is here already knows, and
              the top of the page is for getting them fed. It is here for the
              ones who are not here yet, and for whatever is reading the page
              on their behalf, which needs the relationship between Sudu, PAU
              and its students said outright rather than inferred from a list
              of restaurants. */}
          <p className="pt-2 text-center text-xs leading-relaxed text-muted">
            Sudu delivers food, groceries, skincare and parcels to
            Pan-Atlantic University students. Order from your favourite
            restaurants around Sangotedo, Novare, Lekki and Ikoyi and get your order
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
  image = "",
  away = false,
}: {
  href: string;
  title: string;
  line: string;
  /** The picture at the top of the card. Empty falls back to a tint. */
  image?: string;
  /** Somewhere that is not this site. Link would try to route it. */
  away?: boolean;
}) {
  const look =
    "flex h-full flex-col overflow-hidden rounded-xl border-2 border-ink bg-paper transition active:translate-x-0.5 active:translate-y-0.5";

  // The picture leads, the way it does on the restaurants above and on every
  // shop anybody has ever ordered food from.
  //
  // It was a badge the size of a stamp beside the name, with the blurb under
  // it and the word "See" under that, which made every card a small notice
  // and the grid a page of notices. Cards of the same shape, each showing
  // the thing itself, is the difference between a list of links and a shop.
  //
  // The "See" is gone with it: a card with a photograph on it is plainly
  // something to tap, and the word was a third line of type fighting the
  // price for the eye. The price is the line that gets the tap.
  const inside = (
    <>
      <span className="block aspect-[5/4] w-full overflow-hidden bg-shell">
        <Thumb src={image} name={title} rounded="" variant="banner" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 border-t-2 border-ink p-3.5">
        <span className="font-display text-2xl font-extrabold uppercase leading-[0.95]">
          {title}
        </span>
        <span className="ticket line-clamp-2 leading-snug text-muted">{line}</span>
      </span>
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
