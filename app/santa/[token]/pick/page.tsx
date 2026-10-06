import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { currentCustomer } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import Thumb from "@/components/Thumb";
import ProductSearch from "@/components/ProductSearch";
import { browseProducts, productFacets, PER_PAGE } from "@/lib/products";
import {
  MOST_WISHES,
  memberIn,
  roomByToken,
  fetchCost,
  santaDelivery,
  toBuyWith,
  wishesOf,
} from "@/lib/santa";
import { addFromMenuAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick something we sell",
  description: "Put something off our own shelf on your wishlist.",
  robots: { index: false, follow: false },
};

type Asked = {
  q?: string;
  place?: string;
  category?: string;
  sort?: string;
  page?: string;
};

/**
 * The shop, with a different button on every tile.
 *
 * Half of what somebody wants for Christmas is a thing we would have to go
 * out and find. The other half is on our own shelf already, with a price, a
 * picture and a cost we know, and typing that back in by hand is how the
 * price on a list stops agreeing with the price in the shop.
 *
 * It is the everything list rather than a search box bolted onto the
 * wishlist: the filters, the paging and the pictures are already written,
 * and somebody who does not know what they want has to be able to look
 * rather than to guess a word. The skincare shelf is in it, which it is not
 * on the public list, because somebody picking a present is not hungry.
 */
export default async function SantaPickPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Asked & { added?: string; problem?: string }>;
}) {
  const { token } = await params;
  const asked = await searchParams;

  const room = await roomByToken(token);
  if (!room) notFound();

  const phone = await currentCustomer();
  if (!phone) redirect(`/orders?next=${encodeURIComponent(`/santa/${token}/pick`)}`);

  const me = await memberIn(room.id, phone);
  if (!me || me.leftAt) redirect(`/santa/${token}`);
  if (room.status !== "open") redirect(`/santa/${token}/wishlist`);

  const page = Math.max(1, Number(asked.page ?? 1) || 1);
  const [{ products, total }, facets, mine, fee] = await Promise.all([
    browseProducts({
      query: asked.q,
      place: asked.place,
      category: asked.category,
      sort: (asked.sort as "" | "cheap" | "dear") ?? "",
      page,
      all: true,
    }),
    productFacets(asked.place, true),
    wishesOf(me.id),
    santaDelivery(),
  ]);
  const delivery = fetchCost(1, fee);

  // One thing, fetched once. Each further thing takes another fetch out of
  // the same budget, so this is the ceiling for a single present.
  const spend = toBuyWith(room.budget, 1, fee);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const full = mine.length >= MOST_WISHES;
  const already = new Set(mine.map((one) => one.itemId).filter(Boolean));

  const link = (changes: Partial<Asked>) => {
    const now = new URLSearchParams();
    const { added: _added, problem: _problem, ...rest } = asked;
    const next = { ...rest, ...changes };
    if (next.q) now.set("q", next.q);
    if (next.place) now.set("place", next.place);
    if (next.category) now.set("category", next.category);
    if (next.sort) now.set("sort", next.sort);
    if (next.page && next.page !== "1") now.set("page", next.page);
    const query = now.toString();
    return query === "" ? `/santa/${token}/pick` : `/santa/${token}/pick?${query}`;
  };

  return (
    <div className="space-y-4">
      <p>
        <Link className="text-sm font-semibold text-brand" href={`/santa/${token}/wishlist`}>
          &lsaquo; Back to your wishlist
        </Link>
      </p>

      <header>
        <h1 className="text-2xl font-extrabold">Something we sell</h1>
        <p className="text-sm text-muted">
          Anything here goes straight onto your list at the price on the tile,
          so whoever draws you knows exactly what they are getting.
          {delivery > 0
            ? ` ${naira(spend)} of the ${naira(room.budget)} can go on presents: the other ${naira(delivery)} carries them, ${fee.included === 1 ? "" : `up to ${fee.included} things, `}and whoever draws you picks from the list.`
            : ""}
        </p>
      </header>

      {asked.problem ? (
        <p className="card border-brand/30 bg-brand/5 font-semibold text-brand">
          {asked.problem}
        </p>
      ) : null}
      {asked.added ? (
        <p className="card border-mint/40 bg-mint/10 font-semibold">
          {asked.added} is on your list.{" "}
          <Link className="text-brand underline" href={`/santa/${token}/wishlist`}>
            See the list
          </Link>
        </p>
      ) : null}

      {full ? (
        <p className="card font-semibold">
          Your list is full at {MOST_WISHES}. Take something off it first.
        </p>
      ) : null}

      <Suspense fallback={<div className="field py-3.5" />}>
        <ProductSearch start={asked.q ?? ""} to={`/santa/${token}/pick`} />
      </Suspense>

      <Row label="Where from">
        <Chip href={link({ place: "", category: "", page: "1" })} on={!asked.place}>
          Everywhere
        </Chip>
        {facets.places.map((one) => (
          <Chip
            key={one.id}
            href={link({ place: one.id, category: "", page: "1" })}
            on={asked.place === one.id}
          >
            {one.name}
          </Chip>
        ))}
      </Row>

      {facets.categories.length > 0 ? (
        <Row label="What kind">
          <Chip href={link({ category: "", page: "1" })} on={!asked.category}>
            Anything
          </Chip>
          {facets.categories.map((one) => (
            <Chip key={one} href={link({ category: one, page: "1" })} on={asked.category === one}>
              {one}
            </Chip>
          ))}
        </Row>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {total === 0 ? "Nothing matches that." : `${total} ${total === 1 ? "thing" : "things"}`}
        </p>
        <div className="flex gap-2">
          <Chip href={link({ sort: "", page: "1" })} on={!asked.sort}>
            A to Z
          </Chip>
          <Chip href={link({ sort: "cheap", page: "1" })} on={asked.sort === "cheap"}>
            Cheapest
          </Chip>
          <Chip href={link({ sort: "dear", page: "1" })} on={asked.sort === "dear"}>
            Dearest
          </Chip>
        </div>
      </div>

      {total === 0 ? (
        <p className="card text-sm text-muted">
          Try a different word, or{" "}
          <Link href={`/santa/${token}/wishlist#add`} className="font-semibold text-brand">
            write it on your list yourself
          </Link>{" "}
          and we will go and find it.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((one) => (
            <li key={one.id} className="overflow-hidden rounded-2xl bg-paper shadow-card">
              <span className="block aspect-[4/3]">
                <Thumb src={one.imageUrl} name={one.name} rounded="" />
              </span>
              <div className="p-3">
                <p className="text-sm font-bold leading-tight">{one.name}</p>
                <p className="mt-0.5 text-xs text-muted">{one.restaurant}</p>
                <p className="mt-1 font-extrabold">{naira(one.price)}</p>
                {one.price > spend ? (
                  <p className="mt-0.5 text-xs font-semibold text-brand">
                    over the {naira(spend)}
                  </p>
                ) : null}

                {already.has(one.id) ? (
                  <p className="mt-2 text-sm font-bold text-mint">On your list</p>
                ) : full ? null : (
                  <form action={addFromMenuAction} className="mt-2">
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="itemId" value={one.id} />
                    {/* Where they are standing, so adding a second thing
                      * does not start with finding this page again. */}
                    <input type="hidden" name="back" value={link({})} />
                    <button type="submit" className="btn-quiet w-full px-3 py-1.5 text-sm">
                      Add to my list
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          {page > 1 ? (
            <Link replace href={link({ page: String(page - 1) })} className="btn-quiet px-4 py-2 text-sm">
              Back
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link replace href={link({ page: String(page + 1) })} className="btn-quiet px-4 py-2 text-sm">
              More
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
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
    replace
    scroll={false}
    className={`chip whitespace-nowrap ${on ? "border-brand bg-brand/10 text-brand" : ""}`}
  >
    {children}
  </Link>
);
