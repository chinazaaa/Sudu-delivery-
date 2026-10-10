"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DAILY, EVERY, GROUPS, TABS, type Item } from "@/lib/admin-nav";

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
          on ? "bg-brand text-white" : "text-rail-text hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <span
          aria-hidden
          className={`size-[7px] shrink-0 rounded-[2px] ${on ? "bg-white" : "bg-rail-dot"}`}
        />
        {item.label}
        {count > 0 && (
          <span
            className={`ml-auto rounded-full px-[7px] font-mono text-[10.5px] leading-[1.5] ${
              // Tomato for money nobody has paid, the quieter grey for work
              // that is merely waiting. A rail of red badges says nothing.
              item.href === "/admin/orders"
                ? "bg-brand text-white"
                : "bg-rail-quiet text-rail-text"
            }`}
          >
            {count}
          </span>
        )}
      </Link>
    );
  };

  /*
   * One group open at a time, which is what the board draws.
   *
   * Every group expanded put twenty-eight links in the rail and pushed
   * Settings off the bottom of a laptop screen, so the four that matter sat
   * in the same wall of text as Secret Santa. Collapsed, the rail is the
   * four daily pages and six headings, and the one you are inside is open.
   */
  const inside = GROUPS.find((group) => group.items.some((item) => active(item.href)));
  const [opened, setOpened] = useState<string | null>(null);
  // The address decides, until somebody opens another heading themselves.
  const showing = opened ?? inside?.name ?? null;

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {DAILY.map((item) => (
        <Row key={item.href} item={item} />
      ))}

      {GROUPS.map((group) => {
        const open = showing === group.name;
        // A heading with something waiting under it says so while it is
        // shut, otherwise closing a group hides the one number on it.
        const under = group.items.reduce((count, item) => count + (waiting[item.href] ?? 0), 0);
        return (
          <div key={group.name}>
            <button
              type="button"
              onClick={() => setOpened(open ? "" : group.name)}
              aria-expanded={open}
              className="flex w-full items-center gap-1.5 px-3 pb-1 pt-3.5 text-left font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-rail-dim hover:text-rail-text"
            >
              <span aria-hidden>{open ? "▾" : "▸"}</span>
              {group.name}
              {!open && under > 0 && (
                <span className="ml-auto rounded-full bg-rail-quiet px-[7px] font-mono text-[10.5px] leading-[1.5] text-rail-text">
                  {under}
                </span>
              )}
            </button>
            {open && (
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Row key={item.href} item={item} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const foot = (
    <div className="mt-3.5 flex flex-col gap-0.5 border-t border-rail-line pt-3.5">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[14.5px] font-semibold text-volt hover:bg-white/[0.06]"
      >
        <span aria-hidden className="size-[7px] shrink-0 rounded-[2px] bg-volt" />
        View the shop ↗
      </Link>
      <form action={signOut} className="px-3 pt-1">
        <button className="text-[13px] font-semibold text-rail-dim hover:text-rail-text">
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
      <span className="mt-2 font-mono text-[10px] tracking-[0.1em] text-rail-dim">
        ADMIN
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-shell lg:flex">
      {/* The board's phone bar: the wordmark, and the way into everything
          else. The page says what it is in its own heading at the top of the
          content, so the bar does not repeat it; the current section is
          still named for a screen reader, which is the one place it was
          doing any work. */}
      <header className="sticky top-0 z-40 flex items-center gap-2.5 border-b-2 border-ink bg-ink px-4 py-2.5 lg:hidden">
        <span aria-hidden className="flex flex-col items-end gap-[2px]">
          <span className="block h-[3px] w-3 bg-brand" />
          <span className="block h-[3px] w-2 bg-brand" />
          <span className="block h-[3px] w-1 bg-brand" />
        </span>
        <span className="font-display text-[22px] font-black leading-none text-white [transform:skewX(-10deg)]">
          SUDU
        </span>
        <span className="mt-1.5 font-mono text-[9.5px] tracking-[0.1em] text-rail-faint">
          ADMIN
        </span>
        <span className="sr-only">{current}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the full menu"
          className="ml-auto grid size-[30px] shrink-0 place-items-center rounded-full bg-rail-line"
        >
          <span aria-hidden className="space-y-[3px]">
            <span className="block h-0.5 w-3.5 rounded bg-shell" />
            <span className="block h-0.5 w-3.5 rounded bg-shell" />
            <span className="block h-0.5 w-3.5 rounded bg-shell" />
          </span>
        </button>
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

      <main className="min-w-0 flex-1 px-4 pb-[86px] pt-5 sm:px-6 lg:px-[30px] lg:pb-12 lg:pt-[26px]">
        {children}
      </main>

      {/* The bar, on phones only: the rail is the same thing on a desk.
          Fixed rather than sticky, because half these pages are a long list
          and a bar that scrolls away is a bar that is not there when the
          counter hands you the bags. */}
      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {TABS.map((tab) => {
          const on = tab.href === "/admin/more" ? path.startsWith("/admin/more") : active(tab.href);
          const count = waiting[tab.href] ?? 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-[3px] py-[7px] ${
                on ? "text-brand" : "text-muted"
              }`}
            >
              <span className="relative">
                <span
                  aria-hidden
                  className={`block size-[19px] rounded-md border-2 ${
                    on ? "border-brand bg-brand" : "border-muted"
                  }`}
                />
                {count > 0 && (
                  <span className="absolute -right-2 -top-1.5 min-w-[15px] rounded-full bg-brand px-1 text-center font-mono text-[9.5px] font-semibold leading-[15px] text-white">
                    {count}
                  </span>
                )}
              </span>
              <span className="text-[10.5px] font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
