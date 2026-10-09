import type { Metadata } from "next";
import Link from "next/link";
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
    <div className="space-y-4 pb-10">
      <header className="flex flex-col gap-3 pb-2">
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
        <p className="max-w-[560px] text-[17px] leading-relaxed text-ink/80 sm:text-lg">
          Every restaurant together. One car carries all of it, so anything
          here can go in the same order.
        </p>
      </header>

      <Suspense fallback={<div className="field py-3.5" />}>
        <ProductSearch start={asked.q ?? ""} />
      </Suspense>

      {/* Chips rather than dropdowns, because a filter you can see is one
          people use and a filter behind a tap is one they never find. */}
      <Row label="Where from">
        <Chip href={link({ place: "", category: "" })} on={!asked.place}>
          Everywhere
        </Chip>
        {facets.places.map((one) => (
          <Chip
            key={one.id}
            href={link({ place: one.id, category: "" })}
            on={asked.place === one.id}
          >
            {one.name}
          </Chip>
        ))}
      </Row>

      {facets.categories.length > 0 && (
        <Row label="What kind">
          <Chip href={link({ category: "" })} on={!asked.category}>
            Anything
          </Chip>
          {facets.categories.map((one) => (
            <Chip key={one} href={link({ category: one })} on={asked.category === one}>
              {one}
            </Chip>
          ))}
        </Row>
      )}

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {total === 0
            ? "Nothing matches that."
            : `${total} ${total === 1 ? "thing" : "things"}`}
        </p>
        <div
          aria-label="Sort"
          className="flex items-center gap-1 rounded-full border-2 border-ink bg-paper p-[3px]"
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
              className={`flex min-h-[38px] items-center rounded-full px-3.5 text-sm font-semibold transition ${
                (asked.sort ?? "") === value ? "bg-ink text-white" : "text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

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

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="label mb-1">{label}</p>
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2 pb-1">{children}</div>
    </div>
  </div>
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
