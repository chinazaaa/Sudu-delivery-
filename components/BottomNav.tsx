"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countItems, useCart } from "@/lib/cart";

/** Thumb-height navigation, the way every food app on a phone does it. */
export default function BottomNav() {
  const path = usePathname();
  const cart = useCart();
  const count = countItems(cart);

  if (path.startsWith("/admin")) return null;

  const tabs = [
    { href: "/", label: "Menu", icon: HomeIcon },
    { href: "/orders", label: "Orders", icon: ListIcon },
    { href: "/reorder", label: "Again", icon: RepeatIcon },
    { href: "/cart", label: "Cart", icon: BagIcon, badge: count },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = path === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <Icon />
                {tab.label}
                {tab.badge ? (
                  <span className="absolute right-[22%] top-1.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-white">
                    {tab.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...stroke}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...stroke}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...stroke}>
      <path d="M4 10a6 6 0 0 1 6-6h8m0 0-3-3m3 3-3 3M20 14a6 6 0 0 1-6 6H6m0 0 3 3m-3-3 3-3" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...stroke}>
      <path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
