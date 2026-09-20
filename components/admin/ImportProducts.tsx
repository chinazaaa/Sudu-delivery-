"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importSkincare } from "@/app/admin/actions";

/**
 * A catalogue, in from the file the shop exported.
 *
 * Two thousand products is not something anybody types in, and it is not
 * something anybody wants to do twice. So this is safe to run again: what is
 * already there by name keeps its id and its photograph, and what comes in is
 * the price, the brand and the shelves.
 */
export default function ImportProducts({
  shopName,
  products,
  missingPhotos,
  photosHref,
}: {
  shopName: string;
  products: number;
  /** How many have no picture yet, which is the whole reason to go and
   *  upload a folder of them. */
  missingPhotos: number;
  photosHref: string;
}) {
  const [state, action, busy] = useActionState(importSkincare, { done: "", error: "" });

  return (
    <form action={action} className="card space-y-3">
      <div>
        <h2 className="font-bold">The catalogue</h2>
        <p className="text-sm text-muted">
          {products === 0
            ? "Nothing in yet. Bring the file in and the shelf fills."
            : `${products} product${products === 1 ? "" : "s"} on the shelf` +
              (missingPhotos > 0 ? `, ${missingPhotos} still without a picture.` : ".")}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="shop_name">
          What the shelf is called
        </label>
        <input
          id="shop_name"
          name="shop_name"
          defaultValue={shopName}
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          Used once, when the shelf is first made. Rename it under Restaurants
          after that.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="csv">
          The file
        </label>
        <input
          id="csv"
          name="csv"
          type="file"
          accept=".csv,text/csv,text/plain"
          className="field"
        />
        <p className="mt-1 text-xs text-muted">
          A row per product, with a header naming the columns: title, price,
          vendor, collections, image_filename. Anything with no title or no
          price is skipped and counted.
        </p>
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-semibold text-brand">
          Or paste it
        </summary>
        <textarea
          name="pasted"
          rows={4}
          placeholder="title,price,vendor,collections,image_filename"
          className="field mt-2 font-mono text-xs"
        />
      </details>

      {state.error !== "" && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}
      {state.done !== "" && (
        <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm font-semibold text-mint">
          {state.done}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary px-5">
          {busy ? "Bringing it in…" : "Import"}
        </button>
        {photosHref !== "" && (
          <Link href={photosHref} className="chip border-black/10 bg-white text-brand">
            Upload the pictures
          </Link>
        )}
      </div>

      <p className="text-xs text-muted">
        Running it again updates prices, brands and shelves, and adds anything
        new. Nothing is deleted: a shorter file is a shorter file, not an
        instruction to empty the shelf.
      </p>
    </form>
  );
}
