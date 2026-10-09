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
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        {deep ? (
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="-ml-1 grid size-9 shrink-0 place-items-center rounded-full text-lg hover:bg-ink hover:text-paper"
          >
            ←
          </button>
        ) : (
          // The name beside it went home and the mark did not, which is not a
          // distinction anybody makes when they tap a logo.
          <span className="shrink-0" />
        )}

        {/* The name is the mark now: a bag beside the word "Sudu" was two
            logos doing one job, and the word is the one people read. */}
        <Link href="/" className="min-w-0 flex-1" aria-label="Sudu home">
          <Wordmark size={34} />
          <span className="sr-only">{tagline}</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-6 lg:flex">
          {[
            // Everything there is, one list with filters, rather than the
            // front page's pick of restaurants. "Menu" is what somebody
            // presses when they want to see the lot.
            ["/products", "Menu"],
            ["/collections", "Collections"],
            ["/parcel", "Parcels"],
            ["/skincare", "Skincare"],
            ["/parents", "For parents"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`font-semibold transition ${
                path === href ? "text-brand-dark underline" : "text-ink hover:text-brand-dark"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/products"
          aria-label="Search the menu"
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink transition hover:bg-ink hover:text-paper lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
        </Link>

        <Link href="/reorder" className="hidden items-center gap-1.5 font-semibold lg:flex">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12a8 8 0 0 1 14-5.3L20 9" />
            <path d="M20 4v5h-5" />
            <path d="M20 12a8 8 0 0 1-14 5.3L4 15" />
            <path d="M4 20v-5h5" />
          </svg>
          Order again
        </Link>
        <Link href="/orders" className="hidden font-semibold lg:block">
          My orders
        </Link>

        <Link
          href="/cart"
          aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-ink px-4 font-bold text-shell transition active:scale-95"
        >
          <CartIcon />
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <span className="ticket grid size-[22px] place-items-center rounded-full bg-brand text-white">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
