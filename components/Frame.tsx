"use client";

import { usePathname } from "next/navigation";

/**
 * The column the shop is read in, and the one place that is wrong.
 *
 * Every page of the shop sits in the same centred column with a gutter, and
 * that is right for a menu. Admin is not a page of the shop: the board draws
 * its Ink rail flush to the left edge and full height, and the shop's
 * wrapper was putting a strip of shell down the side of it and a gap over
 * the top, so the rail floated in the middle of the window like a card.
 *
 * The promoter's page is the same case. Its own Ink bar runs edge to edge
 * and the content sets its own width underneath, which the shop's gutter
 * was adding a second margin to.
 *
 * A client component because only the browser knows the address: the
 * header, the footer and the tab bar each hide themselves on admin the same
 * way.
 */
export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const ownsThePage = path.startsWith("/admin") || path.startsWith("/promoter");

  return (
    <main
      className={
        ownsThePage ? "w-full" : "mx-auto w-full max-w-[1240px] px-4 pt-4 sm:px-8"
      }
    >
      {children}
    </main>
  );
}
