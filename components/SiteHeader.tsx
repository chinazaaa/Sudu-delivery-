"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  // The arrow went home from every page, so anyone who had come from their
  // orders, or a restaurant, was thrown out of what they were doing. It goes
  // back where they came from, and only falls home when there is no back.
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, [path]);

  if (path.startsWith("/admin")) return null;

  const deep = path !== "/";

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        {deep ? (
          <button
            type="button"
            onClick={() => (canGoBack ? router.back() : router.push("/"))}
            aria-label="Back"
            className="-ml-1 grid size-9 shrink-0 place-items-center rounded-full text-lg hover:bg-black/[0.04]"
          >
            ←
          </button>
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-lg font-black text-white">
            S
          </span>
        )}

        <Link href="/" className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold leading-none">Sudu</span>
          <span className="block truncate text-xs text-muted">{tagline}</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {[
            ["/", "Menu"],
            ["/orders", "My orders"],
            ["/reorder", "Order again"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                path === href ? "bg-black/[0.06] text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/cart"
          aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          className="relative grid size-10 shrink-0 place-items-center rounded-full bg-black/[0.05] transition active:scale-95 hover:bg-black/[0.08]"
        >
          <CartIcon />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full border-2 border-paper bg-brand px-1 text-[11px] font-bold text-white">
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
