"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CartBar from "./CartBar";
import ItemRow from "./ItemRow";
import ItemSheet from "./ItemSheet";
import ArrivalStrip from "./ArrivalStrip";
import Thumb from "./Thumb";
import { FOOD_KINDS, kindHref } from "@/lib/food-kinds";
import { naira } from "@/lib/money";
import { useCart } from "@/lib/cart";
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
  award = "",
  where = "",
  runFrom = "",
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
  /** The one tilted sticker the hero is allowed, written in admin. Empty
   *  means the hero carries one badge rather than an invented second. */
  award?: string;
  /** Where the food comes from, named from the areas the shop really
   *  delivers out of rather than written into the sentence. */
  where?: string;
  /** The home area, for the ticket and the fee table's caption: the ladder
   *  is that run's, and the others add to it. */
  runFrom?: string;
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
    <div className="bleed">
      {found !== null ? (
        <section className="shell space-y-4 py-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">
              {found.length} result{found.length === 1 ? "" : "s"}
            </h2>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="font-bold underline"
            >
              Clear
            </button>
          </div>
          {found.length === 0 ? (
            <Link href="/custom-order" className="card block">
              <span className="block font-display text-2xl font-extrabold uppercase">
                Still can&apos;t find it?
              </span>
              <span className="mt-1 block text-sm leading-snug text-ink/75">
                Tell us what you are looking for and we will find it, price it,
                and bring it to your block.
              </span>
              <span className="ticket mt-2 block text-brand-dark">
                Ask us to get it
              </span>
            </Link>
          ) : (
            <div className="space-y-3">
              {found.map(({ item, place }) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  inCart={countFor(item.id)}
                  onOpen={() => setOpen({ item, place })}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Hero. What the shop is on the left, what it is doing tonight on
              the right: the page used to open on the run alone, which says
              nothing to the half of campus who were sent a link. */}
          <section className="border-b-2 border-ink">
            <div className="shell grid gap-14 py-16 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col gap-7">
                <div className="flex flex-wrap gap-2">
                  <span className="ticket inline-block border-2 border-ink px-2.5 py-1.5">
                    On PAU campus since 2018
                  </span>
                  {award !== "" && (
                    <span className="sticker px-2.5 py-1.5">{award}</span>
                  )}
                </div>
                <h1 className="font-display text-[clamp(4rem,9vw,8rem)] font-black uppercase leading-[0.86] tracking-[-0.005em]">
                  Outside food.
                  <br />
                  <span className="text-brand">Inside PAU.</span>
                </h1>
                <p className="max-w-[520px] text-xl leading-normal text-ink/80">
                  {said(menu)} and more{where !== "" ? ` from ${where}` : ""}.
                  Mix restaurants in one order, pay once, and collect it at your
                  hostel block.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/products" className="btn-primary text-lg">
                    Start an order
                    <span aria-hidden>→</span>
                  </Link>
                  <a href="#fees" className="btn-quiet text-lg">
                    See delivery fees
                  </a>
                </div>
              </div>

              {arriving !== "" && (
                <div className="relative pl-7 pt-7">
                  <span
                    aria-hidden
                    className="absolute left-0 top-0 h-[70%] w-[72%] opacity-90"
                    style={{
                      background:
                        "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
                    }}
                  />
                  <ArrivalStrip
                    said={arriving}
                    also={alsoArriving}
                    closesAt={closesAt}
                    from={runFrom}
                    feeFrom={fees[0]?.fee ?? 0}
                  />
                </div>
              )}
            </div>
          </section>

          {/* The kitchens, named. */}
          {menu.length > 0 && (
            <section className="shell flex flex-col gap-8 pb-10 pt-16">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="section-title">
                  {menu.length} kitchen{menu.length === 1 ? "" : "s"}.
                  <br />
                  One run.
                </h2>
                <Link href="/products" className="pb-1 font-bold underline">
                  Browse the full menu
                </Link>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {menu.map((place) => (
                  <li key={place.restaurant.id}>
                    <Link
                      href={`/r/${place.restaurant.href}`}
                      className="flex h-full items-center justify-between gap-3 rounded-xl border-2 border-ink bg-paper p-5 transition active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <span className="font-display text-[28px] font-extrabold uppercase leading-none">
                        {place.restaurant.name}
                      </span>
                      <span aria-hidden className="shrink-0 font-bold text-brand">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/products"
                    className="flex h-full items-center justify-between gap-3 rounded-xl border-2 border-ink bg-brand p-5 text-white transition active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <span className="font-display text-[28px] font-extrabold uppercase leading-none">
                      All the food
                    </span>
                    <span aria-hidden className="shrink-0 font-bold">
                      →
                    </span>
                  </Link>
                </li>
              </ul>
            </section>
          )}

          {/* The kinds, wrapped rather than scrolled. */}
          <section aria-label="What kind of food" className="shell pb-16 pt-4">
            <div className="flex flex-wrap gap-2.5">
              {FOOD_KINDS.map((kind, at) => (
                <Link
                  key={kind.label}
                  href={kindHref(kind)}
                  className={`chip px-5 ${at === 0 ? "chip-on" : "bg-transparent"}`}
                >
                  {kind.label}
                </Link>
              ))}
            </div>
          </section>

          {/* The boxes, on Ink: already packed, already priced. */}
          {packs.length > 0 && (
            <section className="bg-ink text-shell">
              <div className="shell flex flex-col gap-9 py-16">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <span className="ticket text-volt">
                      Packed &amp; ready · delivery included
                    </span>
                    <h2 className="section-title">Boxes for every moment</h2>
                  </div>
                  <Link href="/collections" className="pb-1 font-bold text-volt underline">
                    All collections
                  </Link>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {packs.slice(0, 7).map((one, at) => (
                    <li key={one.href}>
                      <Link
                        href={one.href}
                        className={`flex h-full min-h-[220px] flex-col justify-between gap-3.5 rounded-2xl p-6 ${
                          at === 0
                            ? "bg-brand text-white"
                            : "border border-white/10 bg-[#26201b] text-shell"
                        }`}
                      >
                        {at === 0 && (
                          <span className="ticket self-start bg-ink px-2 py-1 text-volt">
                            Most ordered
                          </span>
                        )}
                        <span className="font-display text-[40px] font-extrabold uppercase leading-[0.9]">
                          {one.title}
                        </span>
                        <span className={`font-semibold ${at === 0 ? "" : "text-volt"}`}>
                          {one.line}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {packs.length > 7 && (
                    <li>
                      <Link
                        href="/collections"
                        className="flex h-full min-h-[220px] flex-col justify-between gap-3.5 rounded-2xl bg-volt p-6 text-ink"
                      >
                        <span className="font-display text-[40px] font-extrabold uppercase leading-[0.9]">
                          Everything else, packed
                        </span>
                        <span className="font-semibold">
                          {packs.length - 7} more boxes →
                        </span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </section>
          )}

          {/* Everything that is not tonight's dinner. */}
          <section className="shell flex flex-col gap-9 py-16">
            <div className="flex flex-col gap-3">
              <span className="ticket text-brand-dark">Bridging the gap</span>
              <h2 className="section-title">Not just food</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {buckets.map((one) => (
                <Door
                  key={one.href}
                  href={one.href}
                  title={one.title}
                  line={one.line}
                />
              ))}
            </div>
          </section>

          {/* How a run works: the answer to handing money over first. */}
          <section className="border-y-2 border-ink bg-paper">
            <div className="shell flex flex-col gap-10 py-16">
              <h2 className="section-title">How a run works</h2>
              <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [
                    "Fill your cart",
                    "Add items from one restaurant or several. Two kitchens in one order is fine.",
                  ],
                  [
                    "Pick a run and your block",
                    "Choose the delivery run that suits you and the hostel block you are in.",
                  ],
                  [
                    "Pay once",
                    "Bank transfer, or ask us for a card link. Your order is confirmed once it lands.",
                  ],
                  [
                    "Meet us at your block",
                    "We collect everything, bring it onto campus together and hand it to you in the window.",
                  ],
                ].map(([title, line], at) => (
                  <li
                    key={title}
                    className="flex flex-col gap-3 border-t-4 border-brand pt-5"
                  >
                    <span className="font-display text-[72px] font-black leading-[0.8] text-brand">
                      {String(at + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xl font-bold">{title}</span>
                    <span className="leading-relaxed text-ink/75">{line}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* What carrying it costs, from the shop's own ladder. */}
          {fees.length > 0 && (
            <section id="fees" className="shell grid gap-12 py-16 lg:grid-cols-2 lg:items-start">
              <div className="flex flex-col gap-5">
                <span className="ticket text-brand-dark">Delivery fees</span>
                <h2 className="section-title">
                  One fee per car.
                  <br />
                  Not per person.
                </h2>
                <p className="max-w-[460px] text-lg leading-relaxed text-ink/80">
                  Order with your roommates on the same run and you split one
                  fee. The more of you, the cheaper it gets.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border-2 border-ink bg-paper">
                <table className="w-full border-collapse text-[17px]">
                  {runFrom !== "" && (
                    <caption className="ticket bg-ink px-6 py-4 text-left text-volt">
                      {runFrom} run
                    </caption>
                  )}
                  <tbody>
                    {fees.map((row) => (
                      <tr key={row.label} className="border-b border-line last:border-0">
                        <th scope="row" className="p-5 text-left font-medium">
                          {row.label}
                        </th>
                        <td className="p-5 text-right">
                          <span className="font-display text-[28px] font-extrabold">
                            {naira(row.fee)}
                          </span>
                          {row.each ? (
                            <span className="ml-2 text-[15px] text-muted">
                              + {naira(row.each)}/item
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {areaExtras.map((one) => (
                      <tr key={one.name} className="border-b border-line bg-brand-tint last:border-0">
                        <th scope="row" className="p-5 text-left font-medium">
                          {one.name} restaurants
                        </th>
                        <td className="p-5 text-right font-display text-[28px] font-extrabold">
                          + {naira(one.extra)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* The people who pay and never eat it. */}
          <section className="bg-brand text-white">
            <div className="shell flex flex-wrap items-center justify-between gap-6 py-14">
              <div className="flex max-w-[640px] flex-col gap-3">
                <span className="ticket text-[#ffe38a]">For parents</span>
                <h2 className="font-display text-[clamp(2.5rem,5vw,3.5rem)] font-black uppercase leading-[0.92]">
                  Send a taste of home to their hostel
                </h2>
                <p className="text-lg leading-relaxed">
                  Care packages and monthly foodstuff, paid for from anywhere
                  and handed to your child at their block.
                </p>
              </div>
              <Link
                href="/parents"
                className="btn bg-ink text-white shadow-[4px_4px_0_#ffd23f] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#ffd23f]"
              >
                Send a care package
              </Link>
            </div>
          </section>

          {/* The page ends where the board ends: the band for parents, then
              the footer.

              What stood here was four more things nobody asked for. A trust
              strip saying "since 2018" and "award winning", which the hero
              already says in its two badges. A prompt to split a delivery,
              which the fee table says better, in the place somebody is
              working out what it costs. A line about the app. And a
              paragraph written for a search engine, under all of it, which
              is the one thing on a page that no reader has ever wanted. */}
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
  away = false,
}: {
  href: string;
  title: string;
  line: string;
  /** Somewhere that is not this site. Link would try to route it. */
  away?: boolean;
}) {
  const look =
    "flex h-full flex-col gap-4 rounded-2xl border-2 border-ink bg-paper p-6 transition active:translate-x-0.5 active:translate-y-0.5";

  /*
   * A mark rather than a photograph.
   *
   * These are not things with a picture: a parcel, a group order and "tell
   * us what you need" were all wearing a stock photo of something else,
   * which made four cards that looked like food and were not. An Ink tile
   * with one stroke in it says what kind of thing it is without pretending
   * to show it.
   */
  const inside = (
    <>
      <span className="grid size-[52px] shrink-0 place-items-center rounded-xl bg-ink text-volt">
        <Glyph title={title} />
      </span>
      <span className="font-display text-[32px] font-extrabold uppercase leading-none">
        {title}
      </span>
      <span className="leading-relaxed text-ink/75">{line}</span>
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

/** One stroke per kind of thing, picked off its name. */
function Glyph({ title }: { title: string }) {
  const said = title.toLowerCase();
  const path = said.includes("parcel")
    ? "M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10"
    : said.includes("skin") || said.includes("beauty")
      ? "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"
      : said.includes("group") || said.includes("split")
        ? "M9 8a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.5 3.5 5.2"
        : said.includes("market") || said.includes("grocer")
          ? "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"
          : "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M20 20l-4-4";

  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[26px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}
