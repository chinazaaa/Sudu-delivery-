"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/orders", label: "Orders", icon: "☰" },
  { href: "/admin/runs", label: "Runs", icon: "◷" },
  { href: "/admin/customers", label: "Customers", icon: "☺" },
  { href: "/admin/menu", label: "Restaurants", icon: "🍽" },
  { href: "/admin/promoters", label: "Promoters", icon: "%" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

/**
 * The frame every admin page sits in: a rail on a desktop, a tab bar on a
 * phone, because the run sheet is read standing at a counter.
 */
export default function AdminShell({
  children,
  signOut,
}: {
  children: React.ReactNode;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const active = (href: string) =>
    href === "/admin" ? path === "/admin" : path.startsWith(href);

  return (
    <div className="min-h-screen bg-shell">
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

            <nav className="space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
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

            <div className="space-y-2 px-3 text-sm font-semibold">
              <Link href="/" className="block text-muted hover:text-brand">
                View the shop
              </Link>
              <form action={signOut}>
                <button className="text-muted hover:text-brand">Sign out</button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="no-scrollbar flex overflow-x-auto">
          {NAV.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`block whitespace-nowrap px-4 py-3 text-center text-xs font-bold ${
                  active(item.href) ? "text-brand" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
