import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";
import { optionGroupsFor } from "@/lib/menu";

import { browseProducts, productFacets, PER_PAGE } from "@/lib/products";
import ProductSearch from "@/components/ProductSearch";

export const dynamic = "force-dynamic";

/**
 * A title of its own, and a canonical that ignores the sorting.
 *
 * Every filter of this page is the same list in a different order, and each
 * one competing with the others is how none of them rank. A search somebody
 * typed is never a page worth indexing, so it says so.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Asked>;
}): Promise<Metadata> {
  const asked = await searchParams;
  const here = new URLSearchParams();
  if (asked.place) here.set("place", asked.place);
  if (asked.category) here.set("category", asked.category);
  const query = here.toString();

  return {
    title: "Every menu in one list",
    description:
      "KFC, Domino's, Chicken Republic and more from Sangotedo, delivered to " +
      "Pan-Atlantic University. Search by dish, filter by restaurant, one " +
      "delivery for the lot.",
    alternates: { canonical: query === "" ? "/products" : `/products?${query}` },
    robots: asked.q ? { index: false, follow: true } : undefined,
  };
}

/**
 * A search nobody typed.
 *
 * The site tells search engines how to search it, in the way the standard
 * asks: a SearchAction whose target is /products?q={search_term_string},
 * where the braces are a placeholder a search engine is meant to fill in.
 * Google crawled the address exactly as written instead, braces and all,
 * landed on this page, and then followed every restaurant, category and
 * sort link on it, each of which carries the query along. One placeholder
 * became two hundred and thirty-one crawled addresses, all of them noindex,
 * on a site where nine hundred real dish pages are still waiting to be
 * crawled for the first time.
 *
 * So a query with a brace in it is not a search: nobody types one, and the
 * only thing that produces one is a template nobody filled in. It is
 * dropped, permanently, which collapses the whole tree back to the one real
 * page at the root of it.
 */
const unfilled = (said: string | undefined): boolean =>
  said !== undefined && /[{}]/.test(said);

/** The same address without the query, keeping whatever else was asked for,
 *  so a redirect lands somewhere real rather than at the top of the shop. */
function withoutQuery(asked: Asked): string {
  const rest = new URLSearchParams();
  if (asked.place) rest.set("place", asked.place);
  if (asked.category) rest.set("category", asked.category);
  if (asked.sort) rest.set("sort", asked.sort);
  const query = rest.toString();
  return query === "" ? "/products" : `/products?${query}`;
}

type Asked = {
  q?: string;
  place?: string;
  category?: string;
  sort?: string;
  page?: string;
};

/**
 * Everything, in one list.
 *
 * The home page is a row of restaurants, which suits somebody who has
 * decided where they want food from and is no use at all to somebody who
 * has decided what they want to eat. Wings are wings whoever fried them,
 * and finding them used to mean opening four menus and holding the prices
 * in your head.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Asked>;
}) {
  const asked = await searchParams;
  if (unfilled(asked.q)) permanentRedirect(withoutQuery(asked));
  const page = Math.max(1, Number(asked.page ?? 1) || 1);

  const [{ products, total }, facets] = await Promise.all([
    browseProducts({
      query: asked.q,
      place: asked.place,
      category: asked.category,
      sort: asked.sort === "cheap" || asked.sort === "dear" ? asked.sort : "",
      page,
    }),
    productFacets(asked.place),
  ]);

  // What each thing on this page asks before it can go in a cart. Looked up
  // for the twenty-four on screen rather than for the whole shop, so a card
  // can add a bottle of water in one tap and still send a pizza to the sheet
  // that asks which size.
  const groups = await optionGroupsFor(products.map((one) => one.id));
  const cards = products.map((one) => ({
    category: one.category,
    item: {
      id: one.id,
      name: one.name,
      price: one.price,
      available: true,
      imageUrl: one.imageUrl,
      description: one.description,
      categoryId: one.categoryId,
      containerPct: one.containerPct,
      groups: groups.get(one.id) ?? [],
    },
    restaurant: {
      id: one.restaurantId,
      href: one.slug || one.restaurantId,
      name: one.restaurant,
      logoUrl: "",
      bannerUrl: "",
      brandHex: "",
      closedDays: "",
      areaId: "",
    },
  }));

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (change: Partial<Asked>) => {
    const now = new URLSearchParams();
    const next = { ...asked, ...change, page: change.page ?? undefined };
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== "") now.set(key, String(value));
    }
    const query = now.toString();
    return query === "" ? "/products" : `/products?${query}`;
  };

  return (
    <div className="-mt-4 space-y-4 pb-10">
      <header className="bleed relative overflow-hidden border-b-2 border-ink">
        <span
          aria-hidden
          className="absolute inset-y-0 -right-8 w-[26%] opacity-90"
          style={{
            background:
              "repeating-linear-gradient(-60deg,#e5321d 0 7px,transparent 7px 16px)",
          }}
        />
        <div className="shell relative flex flex-col gap-4 pb-8 pt-7 sm:gap-5 sm:pb-9 sm:pt-11">
        {/* Not "everything": the shop sells more than food now, and this is
            the food door. Calling it everything while skincare, boxes and
            parcels live behind their own cards was the one contradiction the
            front page could not afford. */}
        <span className="ticket text-brand-dark">
          {total} thing{total === 1 ? "" : "s"} · {facets.places.length} kitchen
          {facets.places.length === 1 ? "" : "s"} · one run
        </span>
        <h1 className="font-display text-[min(16vw,6.5rem)] font-black uppercase leading-[0.86] sm:text-[clamp(3.5rem,8vw,6.5rem)]">
          Every menu.
          <br />
          One list.
        </h1>
          <p className="sr-only">
            Every restaurant together. One car carries all of it, so anything
            here can go in the same order.
          </p>

          <Suspense fallback={<div className="field min-h-[58px] max-w-[640px] rounded-full border-2 border-ink" />}>
            <ProductSearch start={asked.q ?? ""} big />
          </Suspense>
        </div>
      </header>

      {/* The board's filter bar, stuck to the top: what kind on one line,
          which kitchen and the sort on the next.

          Chips rather than dropdowns, because a filter you can see is one
          people use and a filter behind a tap is one they never find. The
          kitchens are the smaller mono buttons: there are thirteen of them
          and they are names, not ideas. */}
      {/* Sticky on the outside, full width on the inside.

          Both on one element does not work: .bleed sets left:50%, and on a
          position:sticky element that is not an offset from where it sits,
          it is the edge it sticks to. The bar went half a screen sideways
          and took the width of the page with it. */}
      <div className="sticky top-[57px] z-20 md:top-[65px]">
        <div className="bleed border-b-2 border-ink bg-shell">
          <div className="shell flex flex-col gap-2.5 py-3">
          {facets.categories.length > 0 && (
            <div
              aria-label="What kind"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              <Chip href={link({ category: "" })} on={!asked.category}>
                Anything
              </Chip>
              {facets.categories.map((one) => (
                <Chip key={one} href={link({ category: one })} on={asked.category === one}>
                  {one}
                </Chip>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div
              aria-label="Kitchen"
              className="-mx-4 flex min-w-0 flex-[1_1_320px] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              <Kitchen href={link({ place: "", category: "" })} on={!asked.place}>
                All kitchens
              </Kitchen>
              {facets.places.map((one) => (
                <Kitchen
                  key={one.id}
                  href={link({ place: one.id, category: "" })}
                  on={asked.place === one.id}
                >
                  {one.name}
                </Kitchen>
              ))}
            </div>

            <div
              aria-label="Sort"
              className="flex shrink-0 items-center gap-1 rounded-full border-2 border-ink bg-paper p-[3px]"
            >
              {(
                [
                  ["", "A–Z"],
                  ["cheap", "Cheapest"],
                  ["dear", "Dearest"],
                ] as const
              ).map(([value, label]) => (
                <Link
                  key={label}
                  replace
                  href={link({ sort: value })}
                  className={`flex min-h-9 items-center rounded-full px-3 text-sm font-semibold transition ${
                    (asked.sort ?? "") === value ? "bg-ink text-white" : "text-ink"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Somebody has just told us what they want and been told we do not
          have it. There is no better moment to offer to go and find it. */}
      {total === 0 && (
        <Link href="/custom-order" className="block rounded-2xl bg-paper p-4 shadow-card">
          <span className="block font-bold">Still can&apos;t find it?</span>
          <span className="mt-1 block text-sm leading-snug text-muted">
            Tell us what you are looking for and we will find it, price it, and
            bring it to your block.
          </span>
          <span className="mt-2 block text-sm font-extrabold text-brand">
            Ask us to get it
          </span>
        </Link>
      )}

      <p className="ticket text-muted">
        {total === 0
          ? "Nothing matches that"
          : `${products.length} ${products.length === 1 ? "thing" : "things"} on this page`}
      </p>

      {total === 0 ? (
        <p className="card text-sm text-muted">
          Try a different word, or{" "}
          <Link href="/products" className="font-semibold text-brand">
            start again
          </Link>
          .
        </p>
      ) : (
        <ProductGrid items={cards} />
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          {page > 1 ? (
            <Link
              replace
              href={link({ page: String(page - 1) })}
              className="btn-quiet px-4 py-2 text-sm"
            >
              Back
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              replace
              href={link({ page: String(page + 1) })}
              className="btn-quiet px-4 py-2 text-sm"
            >
              More
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}

/** A kitchen, by name. Smaller and squarer than a chip, because thirteen
 *  names in a row of pills is a row nobody reads to the end of. */
const Kitchen = ({
  href,
  on,
  children,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
}) => (
  <Link
    replace
    href={href}
    className={`flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg border-2 px-3 font-mono text-xs font-semibold tracking-[0.04em] transition ${
      on ? "border-brand bg-brand text-white" : "border-line bg-paper text-ink"
    }`}
  >
    {children}
  </Link>
);

/**
 * A filter, a sort, or a page number.
 *
 * All of them replace rather than push. Paging and filtering are refinements
 * of the one page somebody is on, not places they travelled to, and pushing
 * them buries the way out: three pages into Browse, back went to page two,
 * then page one, then the filter before that, and only then home. Replacing
 * means one back press leaves Browse entirely, which is what the button is
 * for.
 */
const Chip = ({
  href,
  on,
  children,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
}) => (
  <Link
    replace
    href={href}
    className={`chip shrink-0 whitespace-nowrap text-sm ${
      on ? "chip-on" : "bg-paper"
    }`}
  >
    {children}
  </Link>
);
