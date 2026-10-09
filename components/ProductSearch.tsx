"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * The search box on the everything list.
 *
 * It narrows as you type. It used to wait for Enter, on the reasoning that a
 * keystroke on a list of seven hundred is a query to London on every letter
 * and somebody on a Lagos phone line feels every one of them. True, and the
 * wrong trade: you have to know the whole word before you can search for it,
 * and half of searching is not knowing it. Typing "straw" and seeing what
 * comes back is the point.
 *
 * So it asks, but only once the typing stops. A third of a second is long
 * enough that a word is one query rather than eight, and short enough that it
 * reads as the list narrowing rather than as a page loading. The box keeps
 * every letter meanwhile, because it is the address that waits, not the
 * typing.
 *
 * Enter still works, and skips the wait.
 */
export default function ProductSearch({
  start,
  to = "/products",
  big = false,
}: {
  start: string;
  /** The list this box narrows. The Secret Santa picker is the same list
   *  with a different button on every tile. */
  to?: string;
  /** The board's own box: a pill the width of the hero with the hard
   *  shadow under it, rather than the ordinary field. */
  big?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [typed, setTyped] = useState(start);
  const [working, startWorking] = useTransition();

  const go = (next: string) => {
    const now = new URLSearchParams(params.toString());
    if (next.trim() === "") now.delete("q");
    else now.set("q", next.trim());
    // A new search is page one of it.
    now.delete("page");
    // Replaced rather than pushed: typing six letters must not put six pages
    // in the back button between here and wherever they came from.
    startWorking(() => router.replace(`${to}?${now.toString()}`, { scroll: false }));
  };

  // The address is the truth, so arriving with a search in it, or pressing
  // back, fills the box in to match.
  useEffect(() => {
    setTyped(start);
  }, [start]);

  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const now = params.get("q") ?? "";
    if (typed.trim() === now) return;

    waiting.current = setTimeout(() => go(typed), 300);
    return () => {
      if (waiting.current) clearTimeout(waiting.current);
    };
    // `go` is rebuilt every render and would restart the clock on each one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, params]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        // Enter means now, so the wait is cancelled rather than left to fire
        // a second identical search a moment later.
        if (waiting.current) clearTimeout(waiting.current);
        go(typed);
      }}
      className={big ? "relative max-w-[640px]" : "relative"}
    >
      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder={
          big ? "Search jollof, wings, Krispy Kreme…" : "Search wings, pizza, rice…"
        }
        aria-label="Search everything"
        className={
          big
            ? "field min-h-[58px] rounded-full border-2 border-ink bg-paper py-3 pl-[52px] pr-4 text-[17px] shadow-hard"
            : "field py-3.5 pl-10 text-base"
        }
      />
      <span
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted ${
          big ? "left-5" : "left-3.5"
        } ${working ? "animate-pulse" : ""}`}
      >
        {big ? (
          <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
        ) : (
          "⌕"
        )}
      </span>
      {typed !== "" && (
        <button
          type="button"
          onClick={() => {
            if (waiting.current) clearTimeout(waiting.current);
            setTyped("");
            go("");
          }}
          className={`absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-muted ${
            big ? "right-5" : "right-3"
          }`}
        >
          Clear
        </button>
      )}
    </form>
  );
}
