"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The search box on the stock page.
 *
 * There are over three thousand items across the kitchens and the shelf, far
 * past what one page can hold, so the searching is done by the database and
 * this only decides when to ask. It waits a third of a second after the
 * typing stops: long enough not to ask on every letter, short enough that it
 * feels like the list is simply narrowing.
 *
 * The query lives in the address, so the answer survives switching a thing
 * off: the toggle re-renders this same page and the search is still there,
 * rather than dropping somebody back to an empty box after every tap.
 */
export default function StockSearch({ start = "" }: { start?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [said, setSaid] = useState(start);

  // The address is the truth: coming back to the page, or pressing back,
  // must not leave a box with the old word still in it.
  useEffect(() => {
    setSaid(start);
  }, [start]);

  useEffect(() => {
    const now = params.get("q") ?? "";
    if (said.trim() === now) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (said.trim() === "") next.delete("q");
      else next.set("q", said.trim());
      router.replace(`${path}?${next.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [said, params, path, router]);

  return (
    <input
      value={said}
      onChange={(event) => setSaid(event.target.value)}
      placeholder="Find any item, from any restaurant"
      aria-label="Find any item"
      autoFocus
      className="field w-full"
    />
  );
}
