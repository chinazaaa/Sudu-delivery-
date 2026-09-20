"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Thumb from "./Thumb";
import { naira } from "@/lib/money";
import { addToShelf, setShelfQty, useShelf } from "@/lib/skincare-cart";
import type { SkincareProduct } from "@/lib/skincare";

type Facet = { name: string; items: number };

/**
 * Two thousand products, made findable.
 *
 * A menu is twenty things and a shelf is two thousand, so the page is not
 * really the products, it is the ways of cutting them down. The shop files
 * one product under a dozen collections and sells a couple of hundred brands,
 * which is far too many to lay out as chips: a row of two hundred is a row
 * nobody reaches the end of, and it pushes the products off the screen.
 *
 * So the handful people actually use are on the page, and everything else is
 * behind one button, in lists you can type into. What is chosen shows as
 * pills that come off with a tap, because a filter you cannot see is a filter
 * that leaves somebody staring at an empty shelf wondering where it went.
 *
 * All of it lives in the address, so a narrowed shelf can be sent to
 * somebody, and the back button undoes one step rather than all of them.
 */
export default function Shelf({
  products,
  total,
  page,
  perPage,
  shelves,
  brands,
  picked,
}: {
  products: SkincareProduct[];
  total: number;
  page: number;
  perPage: number;
  shelves: Facet[];
  brands: Facet[];
  picked: {
    shelf: string;
    brand: string;
    q: string;
    sort: string;
    under: string;
    over: string;
  };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useShelf();
  const [typed, setTyped] = useState(picked.q);
  const [open, setOpen] = useState(false);

  useEffect(() => setTyped(picked.q), [picked.q]);

  /** One thing changed, everything else kept, and back to the first page. */
  const go = (change: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(change)) {
      if (value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    router.push(`/skincare?${next.toString()}`, { scroll: false });
  };

  const pages = Math.max(1, Math.ceil(total / perPage));

  // What is on, as pills. Named rather than counted: "3 filters" tells
  // somebody how lost they are without telling them how to get back.
  const on: { label: string; off: () => void }[] = [
    picked.shelf !== "" && { label: picked.shelf, off: () => go({ shelf: "" }) },
    picked.brand !== "" && { label: picked.brand, off: () => go({ brand: "" }) },
    picked.q !== "" && { label: `"${picked.q}"`, off: () => go({ q: "" }) },
    picked.over !== "" && {
      label: `over ${naira(Number(picked.over))}`,
      off: () => go({ over: "" }),
    },
    picked.under !== "" && {
      label: `under ${naira(Number(picked.under))}`,
      off: () => go({ under: "" }),
    },
  ].filter(Boolean) as { label: string; off: () => void }[];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ q: typed.trim() });
          }}
          className="relative flex-1"
        >
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Search a product or a brand"
            aria-label="Search skincare"
            className="field py-3.5 pl-11"
          />
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            ⌕
          </span>
        </form>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`chip shrink-0 px-4 ${
            on.length > 0 ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          Filter
          {on.length > 0 && <span className="font-black"> {on.length}</span>}
        </button>
      </div>

      {/* The ones people actually use, on the page. The rest are a tap away,
          which is the right way round: a row of two hundred is a row nobody
          reaches the end of. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => go({ shelf: "" })}
          className={`chip shrink-0 ${
            picked.shelf === "" ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
          }`}
        >
          Everything
        </button>
        {shelves.slice(0, 10).map((shelf) => (
          <button
            key={shelf.name}
            type="button"
            onClick={() => go({ shelf: shelf.name })}
            className={`chip shrink-0 ${
              picked.shelf === shelf.name
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white"
            }`}
          >
            {shelf.name}
          </button>
        ))}
      </div>

      {on.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {on.map((one) => (
            <button
              key={one.label}
              type="button"
              onClick={one.off}
              className="chip border-brand/30 bg-brand-tint text-sm text-brand-dark"
            >
              {one.label} <span className="font-black">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push("/skincare")}
            className="text-sm font-semibold text-muted underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {total} product{total === 1 ? "" : "s"}
        </p>
        <select
          value={picked.sort}
          onChange={(event) => go({ sort: event.target.value })}
          aria-label="Order by price"
          className="field w-auto py-2 text-sm"
        >
          <option value="">Our order</option>
          <option value="cheap">Cheapest first</option>
          <option value="dear">Dearest first</option>
        </select>
      </div>

      {products.length === 0 ? (
        <div className="card space-y-2 text-sm">
          <p className="font-semibold">Nothing matches that.</p>
          <p className="text-muted">
            Try a shorter word, or take a filter off above.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((product) => {
            const inCart = cart.find((one) => one.id === product.id);
            return (
              <li key={product.id} className="card flex flex-col gap-2 p-3">
                <div className="aspect-square">
                  <Thumb src={product.imageUrl} name={product.name} />
                </div>
                <div className="flex-1">
                  {product.brand !== "" && (
                    <button
                      type="button"
                      onClick={() => go({ brand: product.brand })}
                      className="block text-left text-xs font-bold uppercase tracking-wide text-muted"
                    >
                      {product.brand}
                    </button>
                  )}
                  <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
                  <p className="font-extrabold">{naira(product.price)}</p>
                </div>

                {inCart ? (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-label={`One less ${product.name}`}
                      onClick={() => setShelfQty(product.id, inCart.qty - 1)}
                      className="chip size-9 justify-center border-black/10 bg-white text-lg"
                    >
                      −
                    </button>
                    <span className="font-bold">{inCart.qty}</span>
                    <button
                      type="button"
                      aria-label={`One more ${product.name}`}
                      onClick={() => setShelfQty(product.id, inCart.qty + 1)}
                      className="chip size-9 justify-center border-black/10 bg-white text-lg"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      addToShelf({
                        id: product.id,
                        name: product.name,
                        brand: product.brand,
                        price: product.price,
                        imageUrl: product.imageUrl,
                      })
                    }
                    className="btn-quiet w-full py-2 text-sm"
                  >
                    Add
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Step to={page - 1} disabled={page <= 1} params={params}>
            Back
          </Step>
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          <Step to={page + 1} disabled={page >= pages} params={params}>
            More
          </Step>
        </div>
      )}

      {open && (
        <Filters
          shelves={shelves}
          brands={brands}
          picked={picked}
          onPick={go}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Everything there is to narrow by, in lists you can type into.
 *
 * It closes on the backdrop, on the cross and on Escape, because a sheet with
 * one way out is a sheet somebody gets stuck in.
 */
function Filters({
  shelves,
  brands,
  picked,
  onPick,
  onClose,
}: {
  shelves: Facet[];
  brands: Facet[];
  picked: { shelf: string; brand: string; under: string; over: string };
  onPick: (change: Record<string, string>) => void;
  onClose: () => void;
}) {
  const [findShelf, setFindShelf] = useState("");
  const [findBrand, setFindBrand] = useState("");
  const [over, setOver] = useState(picked.over);
  const [under, setUnder] = useState(picked.under);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const matching = (list: Facet[], needle: string) => {
    const wanted = needle.trim().toLowerCase();
    const found = wanted === "" ? list : list.filter((one) => one.name.toLowerCase().includes(wanted));
    return found.slice(0, 40);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-4 sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 pb-2">
          <h2 className="text-lg font-extrabold">Narrow it down</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="chip size-9 justify-center border-black/10 bg-white text-lg"
          >
            ×
          </button>
        </div>

        <section className="space-y-2 border-t border-black/5 py-3">
          <h3 className="label mb-0">What you want to spend</h3>
          <div className="flex items-center gap-2">
            <input
              value={over}
              onChange={(event) => setOver(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="From"
              aria-label="Cheapest"
              className="field py-2 text-sm"
            />
            <span className="text-muted">to</span>
            <input
              value={under}
              onChange={(event) => setUnder(event.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="To"
              aria-label="Dearest"
              className="field py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onPick({ over, under })}
              className="btn-quiet shrink-0 px-4 py-2 text-sm"
            >
              Apply
            </button>
          </div>
        </section>

        <Pickable
          title="Brand"
          all="Any brand"
          values={brands}
          chosen={picked.brand}
          find={findBrand}
          onFind={setFindBrand}
          onPick={(value) => onPick({ brand: value })}
          matching={matching}
        />

        <Pickable
          title="Shelf"
          all="Everything"
          values={shelves}
          chosen={picked.shelf}
          find={findShelf}
          onFind={setFindShelf}
          onPick={(value) => onPick({ shelf: value })}
          matching={matching}
        />

        <button type="button" onClick={onClose} className="btn-primary mt-3 w-full">
          Show what is left
        </button>
      </div>
    </div>
  );
}

function Pickable({
  title,
  all,
  values,
  chosen,
  find,
  onFind,
  onPick,
  matching,
}: {
  title: string;
  all: string;
  values: Facet[];
  chosen: string;
  find: string;
  onFind: (value: string) => void;
  onPick: (value: string) => void;
  matching: (list: Facet[], needle: string) => Facet[];
}) {
  if (values.length === 0) return null;
  const shown = matching(values, find);

  return (
    <section className="space-y-2 border-t border-black/5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="label mb-0">{title}</h3>
        <span className="text-xs text-muted">{values.length}</span>
      </div>

      {values.length > 12 && (
        <input
          value={find}
          onChange={(event) => onFind(event.target.value)}
          placeholder={`Type a ${title.toLowerCase()}`}
          aria-label={`Search ${title.toLowerCase()}`}
          className="field py-2 text-sm"
        />
      )}

      <ul className="max-h-56 space-y-1 overflow-y-auto">
        <li>
          <button
            type="button"
            onClick={() => onPick("")}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
              chosen === "" ? "bg-ink font-bold text-white" : "bg-shell"
            }`}
          >
            {all}
          </button>
        </li>
        {shown.map((one) => (
          <li key={one.name}>
            <button
              type="button"
              onClick={() => onPick(one.name)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                chosen === one.name ? "bg-ink font-bold text-white" : "bg-shell"
              }`}
            >
              <span className="min-w-0 truncate">{one.name}</span>
              <span className={chosen === one.name ? "text-white/70" : "text-muted"}>
                {one.items}
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted">Nothing called that.</li>
        )}
      </ul>
    </section>
  );
}

function Step({
  to,
  disabled,
  params,
  children,
}: {
  to: number;
  disabled: boolean;
  params: URLSearchParams;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        const next = new URLSearchParams(params.toString());
        next.set("page", String(to));
        router.push(`/skincare?${next.toString()}`);
        window.scrollTo({ top: 0 });
      }}
      className="btn-quiet px-5 py-2 text-sm disabled:opacity-40"
    >
      {children}
    </button>
  );
}
