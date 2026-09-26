import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { browseProducts, productFacets, PER_PAGE } from "@/lib/products";
import { naira } from "@/lib/money";
import Thumb from "@/components/Thumb";
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
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">Everything on the menu</h1>
        <p className="text-sm text-muted">
          Every restaurant in one list. One car carries all of it, so anything
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
        <div className="flex gap-2">
          <Chip href={link({ sort: "" })} on={!asked.sort}>
            A to Z
          </Chip>
          <Chip href={link({ sort: "cheap" })} on={asked.sort === "cheap"}>
            Cheapest
          </Chip>
          <Chip href={link({ sort: "dear" })} on={asked.sort === "dear"}>
            Dearest
          </Chip>
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((one) => (
            <li key={one.id}>
              <Link
                href={`/p/${one.id}`}
                className="block overflow-hidden rounded-2xl bg-paper shadow-card transition active:scale-[0.99]"
              >
                <span className="block aspect-[4/3]">
                  <Thumb src={one.imageUrl} name={one.name} rounded="" />
                </span>
                <span className="block p-3">
                  <span className="block text-sm font-bold leading-tight">{one.name}</span>
                  <span className="mt-0.5 block text-xs text-muted">{one.restaurant}</span>
                  <span className="mt-1 block font-extrabold">{naira(one.price)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          {page > 1 ? (
            <Link href={link({ page: String(page - 1) })} className="btn-quiet px-4 py-2 text-sm">
              Back
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={link({ page: String(page + 1) })} className="btn-quiet px-4 py-2 text-sm">
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
    href={href}
    className={`chip shrink-0 whitespace-nowrap text-sm ${
      on ? "border-brand bg-brand-tint font-bold text-brand-dark" : ""
    }`}
  >
    {children}
  </Link>
);
