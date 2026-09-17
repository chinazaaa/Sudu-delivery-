"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/orders", label: "Orders", icon: "☰" },
  { href: "/admin/carts", label: "Left behind", icon: "⌛" },
  { href: "/admin/runs", label: "Runs", icon: "◷" },
  { href: "/admin/customers", label: "Customers", icon: "☺" },
  { href: "/admin/menu", label: "Restaurants", icon: "🍽" },
  { href: "/admin/promoters", label: "Promoters", icon: "%" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

/**
 * The frame every admin page sits in: a rail on a desktop, a drawer on a
 * phone. Seven sections never fitted in a row of tabs along the bottom, where
 * the last two were off the edge of the screen.
 */
export default function AdminShell({
  children,
  signOut,
}: {
  children: React.ReactNode;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // A tap on a link changes the path; the drawer should not survive it.
  useEffect(() => setOpen(false), [path]);

  const active = (href: string) =>
    href === "/admin"
      ? path === "/admin"
      : // A run sheet lives under /admin/batch but belongs to Runs.
        path.startsWith(href) || (href === "/admin/runs" && path.startsWith("/admin/batch"));

  const current = NAV.find((item) => active(item.href))?.label ?? "Admin";

  const nav = (
    <nav className="space-y-1">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
            active(item.href)
              ? "bg-ink text-white"
              : "text-muted hover:bg-black/[0.04] hover:text-ink"
          }`}
        >
          <span className="w-4 text-center opacity-80">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-3 px-3 text-sm font-semibold">
      <Link href="/" className="block text-muted hover:text-brand">
        View the shop
      </Link>
      <form action={signOut}>
        <button className="text-muted hover:text-brand">Sign out</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-shell">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-black/5 bg-paper/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the menu"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-black/10"
        >
          <span className="space-y-1">
            <span className="block h-0.5 w-5 rounded bg-ink" />
            <span className="block h-0.5 w-5 rounded bg-ink" />
            <span className="block h-0.5 w-5 rounded bg-ink" />
          </span>
        </button>
        <span className="min-w-0">
          <span className="block text-xs font-bold uppercase tracking-wide text-muted">
            Sudu admin
          </span>
          <span className="block truncate font-extrabold leading-tight">{current}</span>
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/50"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-5 overflow-y-auto bg-paper p-4 shadow-lift">
            <div className="flex items-center justify-between">
              <Link href="/admin" className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-ink text-lg font-black text-white">
                  S
                </span>
                <span>
                  <span className="block font-extrabold leading-none">Sudu</span>
                  <span className="block text-xs text-muted">Admin</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-full bg-black/[0.06] font-bold"
              >
                ✕
              </button>
            </div>
            {nav}
            <div className="mt-auto border-t border-black/5 pt-4">{footer}</div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-4 sm:py-6">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-6 space-y-5">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-ink text-lg font-black text-white">
                S
              </span>
              <span>
                <span className="block font-extrabold leading-none">Sudu</span>
                <span className="block text-xs text-muted">Admin</span>
              </span>
            </Link>
            {nav}
            {footer}
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
