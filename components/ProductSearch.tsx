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

  /** What this box last put in the address, so its own echo can be told
   *  from somebody else changing the page. */
  const sent = useRef(start);

  const go = (next: string) => {
    const now = new URLSearchParams(params.toString());
    if (next.trim() === "") now.delete("q");
    else now.set("q", next.trim());
    // A new search is page one of it.
    now.delete("page");
    // Remembered, so the answer coming back does not overwrite whatever
    // has been typed since it was asked for.
    sent.current = next.trim();
    // Replaced rather than pushed: typing six letters must not put six pages
    // in the back button between here and wherever they came from.
    startWorking(() => router.replace(`${to}?${now.toString()}`, { scroll: false }));
  };

  /*
   * The address is the truth, except when the address is our own echo.
   *
   * Typing "curtain" sends "cu" to the address after the first pause.
   * The server answers, this page re-renders with start as "cu", and this
   * effect put "cu" back in the box, deleting the "rtain" typed while the
   * answer was in the air. The box emptied itself mid-word and read as
   * the page refreshing under you.
   *
   * It has always been able to do this and only became easy to hit when
   * the no-results answer got slower, which widened the window to most of
   * a second. So the box remembers what it last sent and ignores that
   * coming back. Anything else, arriving with a search in the link or
   * pressing back, is somebody else's change and still fills the box.
   */
  useEffect(() => {
    if (start === sent.current) return;
    sent.current = start;
    setTyped(start);
  }, [start]);

  /*
   * The search button in the header, when you are already on this page.
   *
   * It is a link to /products, which does nothing at all when /products is
   * where you are standing: you tap the magnifier on the menu, the page you
   * wanted is already under you, and the button reads as broken. It is the
   * one place somebody is most likely to tap it.
   *
   * So the header points at #find, and the box answers to it: it scrolls
   * itself into view and takes the keyboard, which is what tapping a
   * magnifier is asking for whichever page you were on.
   */
  const box = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const take = () => {
      if (window.location.hash !== "#find") return;
      box.current?.scrollIntoView({ block: "center" });
      box.current?.focus();
    };

    take();
    window.addEventListener("hashchange", take);
    return () => window.removeEventListener("hashchange", take);
  }, []);

  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const now = params.get("q") ?? "";
    const want = typed.trim();
    if (want === now) return;

    /*
     * One letter is not a search.
     *
     * Every pause sends the box to the server, so "c" on the way to
     * "curtain" was a real search for c, a real empty answer, and a real
     * "nothing matches that" under the box while somebody was still
     * typing the word. The page told them it had failed three times
     * before they had finished asking.
     *
     * Clearing still takes effect at once: an empty box means show me
     * everything, and waiting to be told that would be its own bug.
     */
    if (want.length === 1) return;

    /*
     * Half a second, not a third of one.
     *
     * Long enough that an ordinary typing speed produces one search
     * rather than three, which is the difference between a page that
     * answers and a page that flickers. Short enough that stopping to
     * think still gets an answer before anybody wonders.
     */
    waiting.current = setTimeout(() => go(typed), 500);
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
        id="find"
        ref={box}
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
      {/*
        Said in words, not only as a pulsing magnifier.

        The results below swap to "nothing matches that" the moment a
        half-typed word genuinely matches nothing, and an icon breathing
        quietly in the corner is not enough to tell somebody that is a
        work in progress rather than an answer.
      */}
      {working && (
        <span
          aria-live="polite"
          className="pointer-events-none absolute -bottom-6 left-1 text-[13px] font-semibold text-muted"
        >
          Searching…
        </span>
      )}
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
