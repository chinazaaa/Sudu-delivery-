"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Wordmark from "./Wordmark";
import { countItems, useCart } from "@/lib/cart";

/**
 * A quiet top bar. Restaurants are not links up here: they are the content of
 * the home page, and a row of scrolling text links never looks finished.
 */
export default function SiteHeader({ tagline }: { tagline: string }) {
  const cart = useCart();
  const count = countItems(cart);
  const path = usePathname();
  const router = useRouter();

  /*
   * The arrow went home from every page, so anyone who had come from their
   * orders, or a restaurant, was thrown out of what they were doing. It goes
   * back where they came from, and only falls home when there is no back.
   *
   * Which of those it is has to be counted, because neither guess works.
   * Asking whether the history has more than one entry counts what is ahead
   * as well as what is behind, so somebody who opened a link from WhatsApp,
   * went forward and came back had two entries and nothing behind them.
   * Going back and checking a moment later whether the address moved is
   * worse: this router holds the address unchanged until the next page is
   * ready, so a page that reads the database looks like a back that did
   * nothing, and the arrow threw people home from the list they were on.
   *
   * So the pages of ours they have walked through are counted. Forward is
   * one more, and a back or forward button is one fewer, which leaves zero
   * meaning exactly one thing: whatever is behind this is not ours.
   *
   * Kept for the tab rather than the page, so a reload does not lose the
   * trail and send somebody home from the middle of it.
   */
  const DEPTH = "sudu_depth";
  const depth = useRef(0);
  const first = useRef(true);
  const popped = useRef(false);

  useEffect(() => {
    try {
      depth.current = Number(window.sessionStorage.getItem(DEPTH) ?? "0") || 0;
    } catch {
      /* Without storage it starts at nothing, which only means the first
         back on a reloaded page goes home. */
    }

    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    if (popped.current) {
      popped.current = false;
      depth.current = Math.max(0, depth.current - 1);
    } else {
      depth.current += 1;
    }

    try {
      window.sessionStorage.setItem(DEPTH, String(depth.current));
    } catch {
      /* A convenience, not the trail itself. */
    }
  }, [path]);

  const back = () => {
    if (depth.current > 0) router.back();
    else router.push("/");
  };

  if (path.startsWith("/admin")) return null;

  const deep = path !== "/";

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-shell">
      {/* The board's header, at every width.

          The nav does not disappear on a phone: it drops to a line of its
          own and scrolls, the way the board's own stylesheet does it. The
          two text links beside the cart are what go, because "Order again"
          and "My orders" are both one tap inside the cart's own page. */}
      <div className="shell flex flex-wrap items-center gap-x-8 gap-y-3 py-3.5">
        {/* Back, on a phone only. On a laptop the nav is right there, and
            an arrow beside five links is an arrow nobody presses. */}
        {deep && (
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="-ml-1 grid size-10 shrink-0 place-items-center rounded-full text-lg hover:bg-ink hover:text-paper md:hidden"
          >
            ←
          </button>
        )}

        <Link href="/" className="shrink-0" aria-label="Sudu home">
          <Wordmark size={34} />
          <span className="sr-only">{tagline}</span>
        </Link>

        <nav
          aria-label="Main"
          className="order-3 -mb-1 flex w-full flex-none gap-6 overflow-x-auto pb-1 font-semibold [scrollbar-width:none] md:order-none md:mb-0 md:w-auto md:flex-1 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {[
            ["/products", "Menu"],
            ["/collections", "Collections"],
            ["/parcel", "Parcels"],
            ["/skincare", "Skincare"],
            ["/parents", "For parents"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap transition ${
                path === href ? "text-brand-dark underline" : "hover:text-brand-dark"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/reorder"
            className="hidden items-center gap-1.5 font-semibold sm:flex"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12a8 8 0 0 1 14-5.3L20 9" />
              <path d="M20 4v5h-5" />
              <path d="M20 12a8 8 0 0 1-14 5.3L4 15" />
              <path d="M4 20v-5h5" />
            </svg>
            Order again
          </Link>
          <Link href="/orders" className="hidden font-semibold sm:block">
            My orders
          </Link>

          <Link
            href="/cart"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-[18px] font-bold text-shell transition active:scale-95"
          >
            <CartIcon />
            Cart
            {count > 0 && (
              <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-brand font-mono text-xs text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  /* The board's bag, not a trolley. */
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 7h12l-1 13H7L6 7z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
