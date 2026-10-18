"use client";

import { useActionState } from "react";
import { savePrintPhoto } from "@/app/admin/actions";

/**
 * One picture for one printing service.
 *
 * Its own little form per row, because the photographs arrive one at a
 * time over weeks: somebody prints a banner, photographs it, and that one
 * row stops being empty. A single save button over two hundred rows would
 * be a form nobody ever finishes.
 */
export default function PrintPhoto({
  slug,
  name,
  url,
}: {
  slug: string;
  name: string;
  url: string;
}) {
  const [state, action, busy] = useActionState(savePrintPhoto, { done: "", error: "" });

  return (
    <form action={action} encType="multipart/form-data" className="flex items-center gap-3 py-2">
      <input type="hidden" name="slug" value={slug} />
      <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-shell">
        {url !== "" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name} className="size-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <input
          name="photo"
          type="file"
          accept="image/*"
          aria-label={`Picture for ${name}`}
          className="mt-1 w-full text-xs"
        />
        {state.error !== "" && (
          <span className="block text-xs font-semibold text-red-700">{state.error}</span>
        )}
        {state.done !== "" && (
          <span className="block text-xs font-semibold text-mint">{state.done}</span>
        )}
      </span>
      <button type="submit" disabled={busy} className="btn-quiet shrink-0 px-3 py-1.5 text-sm">
        {busy ? "…" : url === "" ? "Add" : "Replace"}
      </button>
    </form>
  );
}
