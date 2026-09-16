"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countItems, useCart } from "@/lib/cart";

/** One bar: the mark, where you can go, and the cart. */
export default function SiteHeader({
  restaurants = [],
}: {
  restaurants?: { id: string; name: string }[];
}) {
  const cart = useCart();
  const count = countItems(cart);
  const path = usePathname();

  if (path.startsWith("/admin")) return null;

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
        path === href ? "bg-black/[0.06] text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Sudu home">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">
            S
          </span>
          <span className="hidden text-lg font-extrabold sm:block">Sudu</span>
        </Link>

        <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {link("/", "Menu")}
          {restaurants.map((restaurant) =>
            link(`/r/${restaurant.id}`, restaurant.name)
          )}
          {link("/orders", "My orders")}
          {link("/reorder", "Order again")}
        </nav>

        <Link
          href="/cart"
          aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
          className="relative grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-10px_rgba(255,90,31,0.9)] transition active:scale-95"
        >
          <span aria-hidden className="text-lg">🛒</span>
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full border-2 border-paper bg-ink px-1 text-[11px] font-bold text-white">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
