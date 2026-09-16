"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countItems, useCart, cartSubtotal } from "@/lib/cart";
import { naira } from "@/lib/money";

export default function SiteHeader() {
  const cart = useCart();
  const count = countItems(cart);
  const path = usePathname();

  if (path.startsWith("/admin")) return null;

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-black/[0.04] ${
        path === href ? "text-ink" : "text-ink/60"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-black text-white">
            S
          </span>
          <span className="text-lg font-extrabold tracking-tight">Sudu</span>
        </Link>

        <nav className="ml-2 hidden gap-1 sm:flex">
          {link("/", "Menu")}
          {link("/orders", "My orders")}
          {link("/reorder", "Order again")}
        </nav>

        <Link
          href="/checkout"
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

      <nav className="flex gap-1 border-t border-black/5 px-4 py-1.5 sm:hidden">
        {link("/", "Menu")}
        {link("/orders", "My orders")}
        {link("/reorder", "Order again")}
      </nav>
    </header>
  );
}
