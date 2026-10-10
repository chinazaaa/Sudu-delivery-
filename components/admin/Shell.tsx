"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; badge?: number };
type Group = { name: string; items: Item[] };

/**
 * The four things open every day, then everything else behind a heading.
 *
 * Twenty-eight links in one list meant the ones that matter sat in the same
 * typography as Secret Santa, and reaching Settings was a scroll. The board
 * puts the daily four at the top and files the rest under six headings that
 * open one at a time.
 */
const DAILY: Item[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/schedule", label: "Schedule" },
];

const GROUPS: Group[] = [
  {
    name: "Fulfilment",
    items: [
      { href: "/admin/carts", label: "Left behind" },
      { href: "/admin/groups", label: "Groups" },
      { href: "/admin/subscriptions", label: "Repeats" },
      { href: "/admin/parcels", label: "Parcels" },
    ],
  },
  {
    name: "Catalogue",
    items: [
      { href: "/admin/menu", label: "Restaurants" },
      { href: "/admin/stock", label: "Stock" },
      { href: "/admin/skincare", label: "Skincare" },
      { href: "/admin/occasions", label: "Collections" },
      { href: "/admin/coupons", label: "Offers" },
    ],
  },
  {
    name: "Requests",
    items: [
      { href: "/admin/requests", label: "Asked for" },
      { href: "/admin/wishes", label: "Wishes" },
      { href: "/admin/links", label: "Checkout links" },
    ],
  },
  {
    name: "People",
    items: [
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/promoters", label: "Promoter" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    name: "Money",
    items: [
      { href: "/admin/profit", label: "Profit" },
      { href: "/admin/money", label: "Other money" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    name: "Site",
    items: [
      { href: "/admin/home", label: "Home page" },
      { href: "/admin/santa", label: "Secret Santa" },
      { href: "/admin/email", label: "Email" },
      { href: "/admin/notifications", label: "Notifications" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/deletions", label: "Deleted" },
    ],
  },
];

const EVERY = [...DAILY, ...GROUPS.flatMap((one) => one.items)];

/**
 * The frame every admin page sits in: an Ink rail on a desktop, a drawer on
 * a phone.
 *
 * The rail is dark on purpose. Admin is the back of the shop, open all day
 * beside the real one, and the two should never be mistaken for each other
 * at a glance.
 */
export default function AdminShell({
  children,
  signOut,
  /** What is waiting, by section. Only what is worth a number: a badge on
   *  everything is a badge on nothing. */
  waiting = {},
}: {
  children: React.ReactNode;
  signOut: () => Promise<void>;
  waiting?: Record<string, number>;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string) =>
    href === "/admin"
      ? path === "/admin"
      : // A run sheet lives under /admin/batch but belongs to Runs.
        path.startsWith(href) || (href === "/admin/runs" && path.startsWith("/admin/batch"));

  // A tap on a link changes the path; the drawer should not survive it.
  useEffect(() => setOpen(false), [path]);

  /*
   * Hold the page still while the drawer is over it.
   *
   * The list is taller than a phone, so reaching the bottom means scrolling
   * the drawer, and that scroll ran on past the end of the list into the
   * page underneath. By the time a link was tapped the page behind had been
   * dragged to its bottom, the drawer closed, and the section opened at the
   * footer with no way to tell why.
   */
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const was = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = was;
    };
  }, [open]);

  /*
   * And start a new page at the top of it. A backstop rather than the fix,
   * except where the address names something, which is how "Edit it" on a
   * request lands on one row out of two hundred.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "") return;
    window.scrollTo(0, 0);
  }, [path]);

  const current = EVERY.find((item) => active(item.href))?.label ?? "Admin";

  const Row = ({ item }: { item: Item }) => {
    const on = active(item.href);
    const count = waiting[item.href] ?? 0;
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[14.5px] font-semibold transition ${
          on ? "bg-brand text-white" : "text-[#cfc7bc] hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <span
          aria-hidden
          className={`size-[7px] shrink-0 rounded-[2px] ${on ? "bg-white" : "bg-[#4a443c]"}`}
        />
        {item.label}
        {count > 0 && (
          <span
            className={`ml-auto rounded-full px-[7px] font-mono text-[10.5px] leading-[1.5] ${
              // Tomato for money nobody has paid, the quieter grey for work
              // that is merely waiting. A rail of red badges says nothing.
              item.href === "/admin/orders"
                ? "bg-brand text-white"
                : "bg-[#3a332d] text-[#cfc7bc]"
            }`}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {DAILY.map((item) => (
        <Row key={item.href} item={item} />
      ))}

      {GROUPS.map((group) => (
        <div key={group.name}>
          <p className="flex items-center gap-1.5 px-3 pb-1 pt-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#7e756a]">
            <span aria-hidden>▾</span>
            {group.name}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <Row key={item.href} item={item} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const foot = (
    <div className="mt-3.5 flex flex-col gap-0.5 border-t border-[#2c2721] pt-3.5">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[14.5px] font-semibold text-volt hover:bg-white/[0.06]"
      >
        <span aria-hidden className="size-[7px] shrink-0 rounded-[2px] bg-volt" />
        View the shop ↗
      </Link>
      <form action={signOut} className="px-3 pt-1">
        <button className="text-[13px] font-semibold text-[#7e756a] hover:text-[#cfc7bc]">
          Sign out
        </button>
      </form>
    </div>
  );

  const wordmark = (
    <div className="flex items-center gap-2.5 px-2.5 pb-4 pt-1">
      <span aria-hidden className="flex flex-col items-end gap-[3px]">
        <span className="block h-1 w-4 bg-brand" />
        <span className="block h-1 w-[11px] bg-brand" />
        <span className="block h-1 w-1.5 bg-brand" />
      </span>
      <span className="font-display text-[28px] font-black leading-none text-white [transform:skewX(-10deg)]">
        SUDU
      </span>
      <span className="mt-2 font-mono text-[10px] tracking-[0.1em] text-[#7e756a]">
        ADMIN
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-shell lg:flex">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b-2 border-ink bg-ink px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the menu"
          className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-[#3a322b]"
        >
          <span className="space-y-1">
            <span className="block h-0.5 w-5 rounded bg-shell" />
            <span className="block h-0.5 w-5 rounded bg-shell" />
            <span className="block h-0.5 w-5 rounded bg-shell" />
          </span>
        </button>
        <span className="min-w-0">
          <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#7e756a]">
            Sudu admin
          </span>
          <span className="block truncate font-bold leading-tight text-white">{current}</span>
        </span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close the menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/60"
          />
          {/* overscroll-contain keeps a flick inside the drawer: without it
              the end of the list hands the scroll to the page behind. */}
          <aside className="absolute inset-y-0 left-0 flex w-[266px] max-w-[85vw] flex-col overflow-y-auto overscroll-contain bg-ink p-3">
            <div className="flex items-start justify-between">
              {wordmark}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 font-bold text-white"
              >
                ✕
              </button>
            </div>
            {nav}
            {foot}
          </aside>
        </div>
      )}

      <aside className="hidden w-[244px] shrink-0 flex-col bg-ink p-3 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
        {wordmark}
        {nav}
        {foot}
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-[30px] lg:pb-12 lg:pt-[26px]">
        {children}
      </main>
    </div>
  );
}
