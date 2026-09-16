"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countItems, useCart, cartSubtotal } from "@/lib/cart";
import { naira } from "@/lib/money";

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
      href={href}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition hover:bg-black/[0.04] ${
        path === href ? "bg-black/[0.05] text-ink" : "text-muted"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">
            S
          </span>
          <span className="text-lg font-extrabold tracking-tight">Sudu</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          {link("/", "Menu")}
          {restaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/r/${restaurant.id}`}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-black/[0.04] hover:text-ink"
            >
              {restaurant.name}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-black/10" />
          {link("/orders", "My orders")}
          {link("/reorder", "Order again")}
        </nav>

        <Link
          href="/cart"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85"
        >
          <span aria-hidden>🛒</span>
          {count > 0 ? (
            <>
              <span>{count}</span>
              <span className="hidden sm:inline">· {naira(cartSubtotal(cart))}</span>
            </>
          ) : (
            <span>Cart</span>
          )}
        </Link>
      </div>

      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-t border-black/5 px-4 py-2 sm:hidden [&>*]:shrink-0">
        {link("/", "Menu")}
        {restaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            href={`/r/${restaurant.id}`}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold text-muted"
          >
            {restaurant.name}
          </Link>
        ))}
        {link("/orders", "My orders")}
        {link("/reorder", "Order again")}
      </nav>
    </header>
  );
}
