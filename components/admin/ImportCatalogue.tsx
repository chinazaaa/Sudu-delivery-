"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importCatalogue } from "@/app/admin/actions";

/**
 * A whole catalogue into this restaurant, from the file it came in.
 *
 * Two hundred products from a market is not something anybody types in, and
 * it is not something anybody wants to do twice. Safe to run again: what is
 * already there by name keeps its id and its photograph, and what comes in is
 * the price, the section and whether the shop has it.
 */
export default function ImportCatalogue({
  restaurantId,
  items,
  photosHref,
}: {
  restaurantId: string;
  items: number;
  photosHref: string;
}) {
  const [state, action, busy] = useActionState(importCatalogue, { done: "", error: "" });

  return (
    <details className="card">
      <summary className="cursor-pointer font-semibold">
        Bring a catalogue in
        <span className="ml-2 text-sm font-normal text-muted">
          a file, rather than a form each
        </span>
      </summary>

      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="restaurant_id" value={restaurantId} />

        <div>
          <label className="label" htmlFor="csv">
            The file
          </label>
          <input
            id="csv"
            name="csv"
            type="file"
            accept=".csv,.json,text/csv,application/json,text/plain"
            className="field"
          />
          <p className="mt-1 text-xs text-muted">
            A spreadsheet or a JSON list, with a header naming its columns:
            a name, a price, a category and a picture. A restaurant export
            works as it comes, headings and all, and its option groups come
            in with it, so a dish that asks which rice or how spicy arrives
            asking. Anything with no name or no price is left out and
            counted, because an export writes &quot;Out of stock&quot; where
            the price goes.
          </p>
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-semibold text-brand">
            Or paste it
          </summary>
          <textarea
            name="pasted"
            rows={4}
            placeholder="category,name,price,image_url"
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
          {items > 0 && (
            <Link href={photosHref} className="chip border-black/10 bg-white text-brand">
              The pictures
            </Link>
          )}
        </div>

        <p className="text-xs text-muted">
          Running it again updates prices and sections, and adds anything new.
          Nothing is deleted: a shorter file is a shorter file, not an
          instruction to empty the menu.
        </p>
      </form>
    </details>
  );
}
