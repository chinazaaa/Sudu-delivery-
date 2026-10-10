"use client";

import { usePathname } from "next/navigation";

/**
 * The shop's own furniture, which admin and the promoter's page are not
 * part of.
 *
 * The footer, the ribbon and the rest are rendered once in the root layout
 * for every page there is, and on the back of the shop they were simply
 * wrong: a fifteen-link shop footer under the run sheet, and a promotions
 * ribbon over the top of the Ink rail. Each one that could hide itself
 * already did; this is for the ones rendered on the server, which cannot
 * know the address.
 */
export default function ShopOnly({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/promoter")) return null;
  return <>{children}</>;
}
