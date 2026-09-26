import type { MetadataRoute } from "next";
import { db } from "@/lib/supabase";

/**
 * Read once an hour rather than once a crawler.
 *
 * It was force-dynamic and built from the whole menu, which fetches every
 * restaurant, every dish, every category and the options on all eight hundred
 * items. That is the right thing for a page somebody is reading and far too
 * much for a list of addresses: on a cold start it ran long enough for Google
 * to give up, which is what "Couldn't fetch" means. The two queries below ask
 * for ids and nothing else.
 */
export const revalidate = 3600;

/** PostgREST hands back a thousand rows and says nothing about the rest. */
const PAGE = 1000;

async function everyRow<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let at = 0; ; at += PAGE) {
    const { data, error } = await page(at, at + PAGE - 1);
    if (error) throw new Error("sitemap read failed");
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

/**
 * The pages worth finding: the menu, each restaurant, each thing on sale.
 * An order page is private and a cart belongs to one person, so neither is
 * here.
 *
 * If the database is unreachable the fixed pages alone are still a valid
 * sitemap, which beats a 500 and a crawler that stops asking.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store";
  const home = [
    { url: site, changeFrequency: "daily" as const, priority: 1 },
    // The two pages somebody searching for what we do would land on, and
    // neither was listed.
    { url: `${site}/products`, changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${site}/parcel`, changeFrequency: "weekly" as const, priority: 0.7 },
    // Written for the search rather than for the shop, so it has to be
    // findable: nothing in the header or the tab bar points at it.
    { url: `${site}/delivery-to-pau`, changeFrequency: "monthly" as const, priority: 0.8 },
    // Who the shop is, for anybody asking that rather than asking for food.
    { url: `${site}/about`, changeFrequency: "monthly" as const, priority: 0.6 },
    // Both are public pages the stores point at, so they are worth finding.
    { url: `${site}/support`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${site}/privacy`, changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  try {
    // The kind column is newer than some databases, so ask for it and fall
    // back rather than letting one missing field empty the whole sitemap.
    const read = (columns: string) =>
      db()
        .from("restaurants")
        .select(columns)
        .eq("active", true)
        .order("id")
        .overrideTypes<{ id: string; slug?: string | null; kind?: string }[]>();

    let { data: shops, error } = await read("id, slug, kind");
    if (error) ({ data: shops, error } = await read("id, slug"));
    if (error) ({ data: shops } = await read("id"));

    const food = (shops ?? []).filter((one) => (one.kind ?? "food") !== "skincare");
    if (food.length === 0) return home;

    const ids = food.map((one) => one.id);
    const items = await everyRow<{ id: string }>((from, to) =>
      db()
        .from("menu_items")
        .select("id")
        .in("restaurant_id", ids)
        .order("id")
        .range(from, to)
    );

    return [
      ...home,
      ...food.map((one) => ({
        // The name, not the id: the id is a second address for the same page,
        // and a sitemap that disagrees with every link on the site splits
        // what each of them is worth.
        url: `${site}/r/${one.slug || one.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...items.map((item) => ({
        url: `${site}/p/${item.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return home;
  }
}
