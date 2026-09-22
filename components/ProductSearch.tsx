"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * The search box on the everything list.
 *
 * Typed rather than instant: a keystroke on a list of seven hundred is a
 * query to London on every letter, and somebody on a Lagos phone line feels
 * every one of them.
 */
export default function ProductSearch({ start }: { start: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [typed, setTyped] = useState(start);

  const go = (next: string) => {
    const now = new URLSearchParams(params.toString());
    if (next.trim() === "") now.delete("q");
    else now.set("q", next.trim());
    now.delete("page");
    router.push(`/products?${now.toString()}`);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        go(typed);
      }}
      className="relative"
    >
      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Search wings, pizza, rice…"
        aria-label="Search everything"
        className="field py-3.5 pl-10 text-base"
      />
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        ⌕
      </span>
      {typed !== "" && (
        <button
          type="button"
          onClick={() => {
            setTyped("");
            go("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted"
        >
          Clear
        </button>
      )}
    </form>
  );
}
