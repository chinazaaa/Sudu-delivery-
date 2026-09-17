import type { MetadataRoute } from "next";
import { menuView } from "@/lib/menu";

export const dynamic = "force-dynamic";

/**
 * The pages worth finding: the menu, each restaurant, each thing on sale.
 * An order page is private and a cart belongs to one person, so neither is
 * here.
 *
 * Built from the menu at request time. If the database is unreachable the
 * home page alone is still a valid sitemap, which beats a 500.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
  const home = [{ url: site, changeFrequency: "daily" as const, priority: 1 }];

  try {
    const menu = await menuView();
    return [
      ...home,
      ...menu.map((place) => ({
        url: `${site}/r/${place.restaurant.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...menu.flatMap((place) =>
        place.items.map((item) => ({
          url: `${site}/p/${item.id}`,
          changeFrequency: "weekly" as const,
          priority: 0.5,
        }))
      ),
    ];
  } catch {
    return home;
  }
}
