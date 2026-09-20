"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PARTY_CHANGED, readGroup } from "./GroupLink";
import { countItems, useCart } from "@/lib/cart";
import { shelfCount, useShelf } from "@/lib/skincare-cart";

/** Thumb-height navigation, the way every food app on a phone does it. */
export default function BottomNav() {
  const path = usePathname();
  const cart = useCart();
  // Both baskets. They are two orders and two days, but one badge: a
  // skincare basket nobody can see from the menu is a basket nobody
  // remembers they have.
  const count = countItems(cart) + shelfCount(useShelf());

  // Ordering together is the whole point of the shop, so it gets a thumb on
  // the bar rather than a card somebody has to scroll to. Which group, or
  // whether there is one at all, is read here and kept current: somebody can
  // start one from the page they are already standing on.
  const [group, setGroup] = useState("");
  useEffect(() => {
    const read = () => setGroup(readGroup());
    read();
    window.addEventListener(PARTY_CHANGED, read);
    return () => window.removeEventListener(PARTY_CHANGED, read);
  }, []);

  if (path.startsWith("/admin")) return null;

  const tabs = [
    { href: "/", label: "Menu", icon: HomeIcon },
    { href: "/orders", label: "Orders", icon: ListIcon },
    // In a group this is the group itself; out of one it is the page about
    // ordering together, which is where starting one lives along with the
    // cars you have been in. One tab either way, because it is one idea
    // either way.
    {
      href: group ? `/g/${group}` : "/group",
      label: "Group",
      icon: GroupIcon,
      match: group ? `/g/${group}` : "/group",
    },
    { href: "/cart", label: "Cart", icon: BagIcon, badge: count },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          // A group page carries an id, so the tab cannot be lit by matching
          // the whole address the way the fixed ones are.
          const active = path === tab.href || (tab.match ? path === tab.match : false);
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

/** Two people, which is the smallest a group can be. */
function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" {...stroke}>
      <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20a6.5 6.5 0 0 1 13 0M16.5 11a3 3 0 1 0 0-6M18 14.2a5.5 5.5 0 0 1 3.5 5.1" />
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
