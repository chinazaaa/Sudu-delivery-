import type { MetadataRoute } from "next";
import { skincareFacets, skincareOn } from "@/lib/skincare";
import { pharmacyFacets, pharmacyOn } from "@/lib/pharmacy";
import { safeSettings } from "@/lib/settings";
import { isExtra, onTheMenu } from "@/lib/shelf";
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
    // Two whole shelves of the shop that were never listed at all: the one
    // with two thousand products on it, and the one that makes delivery
    // cheap enough to bother with.
    { url: `${site}/skincare`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${site}/pharmacy`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${site}/group`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${site}/custom-order`, changeFrequency: "monthly" as const, priority: 0.7 },
    // Two shelves of boxes, each its own page since a care package and a
    // birthday are not the same search.
    { url: `${site}/collections`, changeFrequency: "weekly" as const, priority: 0.7 },
    /* The page written for somebody who is not a student, and the only one
       of these with a customer behind it who searches for this at all. It
       was not on this list, so the one page worth finding on Google was the
       one page Google was never told about. */
    { url: `${site}/parents`, changeFrequency: "weekly" as const, priority: 0.9 },
    // Written for the search rather than for the shop, so it has to be
    // findable: nothing in the header or the tab bar points at it.
    { url: `${site}/delivery-to-pau`, changeFrequency: "monthly" as const, priority: 0.8 },
    // The other three written the same way, one per question somebody types.
    // Each answers a different one: what is there to snack on, how do I send
    // something from far away, what does a room need.
    { url: `${site}/pau-snacks`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-pharmacy`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-project-printing`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-tailoring`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-hair-and-barbing`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-phone-and-laptop-repair`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-buy-a-laptop`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${site}/pau-laundry`, changeFrequency: "monthly" as const, priority: 0.8 },
    {
      url: `${site}/send-a-gift-to-pau`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${site}/pau-student-store`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    // Who the shop is, for anybody asking that rather than asking for food.
    { url: `${site}/about`, changeFrequency: "monthly" as const, priority: 0.6 },
    // The job, for anybody searching for a way to earn around campus.
    {
      url: `${site}/become-a-promoter`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    // Both are public pages the stores point at, so they are worth finding.
    { url: `${site}/support`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${site}/privacy`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${site}/terms`, changeFrequency: "monthly" as const, priority: 0.3 },
    // A card provider or a store asks for this one by address.
    { url: `${site}/return-policy`, changeFrequency: "monthly" as const, priority: 0.3 },
    // Its own arrangement and its own page: money held for weeks against a
    // gift nobody has chosen yet is not answered by the food terms.
    { url: `${site}/santa/terms`, changeFrequency: "monthly" as const, priority: 0.3 },
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

    const food = (shops ?? []).filter((one) => onTheMenu(one.kind));
    if (food.length === 0) return home;

    const ids = food.map((one) => one.id);

    // The categories a dish is filed under, so the extras can be left out:
    // a pot of sauce is bought alongside something, never searched for, and
    // offering thirty-four of them puts them in the queue ahead of dishes.
    const extras = new Set(
      (
        await db()
          .from("menu_categories")
          .select("id, name")
          .overrideTypes<{ id: string; name: string }[]>()
          .then(
            (answer) => answer.data ?? [],
            () => [] as { id: string; name: string }[]
          )
      )
        .filter((one) => isExtra(one.name))
        .map((one) => one.id)
    );

    // The name as well as the id, because the name is the address the rest
    // of the site links to now and a sitemap that disagrees with every link
    // on the site splits what each of them is worth. The slug column is
    // newer than some databases, so ask for it and fall back rather than
    // letting one missing field empty the whole sitemap.
    type Row = { id: string; slug?: string | null; category_id: string | null };
    const readItems = (columns: string) =>
      everyRow<Row>((from, to) =>
        db()
          .from("menu_items")
          .select(columns)
          .in("restaurant_id", ids)
          .order("id")
          .range(from, to)
      );

    const items = (
      await readItems("id, slug, category_id").catch(() =>
        readItems("id, category_id")
      )
    ).filter((item) => !(item.category_id && extras.has(item.category_id)));

    // Every collection and every occasion. Each is a real page with its own
    // boxes, its own price and its own share card, and none of them was
    // listed: they were reachable only by tapping through the front page.
    const packed = await db()
      .from("occasions")
      .select("slug, kind, active")
      .eq("active", true)
      .order("slug")
      .overrideTypes<{ slug: string; kind?: string; active: boolean }[]>()
      .then(
        (answer) => answer.data ?? [],
        () => [] as { slug: string; kind?: string }[]
      );

    // The skincare shelf has no page per product: it is one page with
    // filters on it. What it does have is a page per brand and per shelf,
    // and "CeraVe, delivered in Lagos" is a thing people actually search
    // for. Only the ones with enough on them to be worth landing on.
    const facets = await skincareFacets().catch(() => ({ shelves: [], brands: [] }));
    const skincare = skincareOn(await safeSettings())
      ? [
          ...facets.brands
            .filter((one) => one.items >= 3)
            .slice(0, 120)
            .map((one) => ({
              url: `${site}/skincare?brand=${encodeURIComponent(one.name)}`,
              changeFrequency: "weekly" as const,
              priority: 0.6,
            })),
          ...facets.shelves
            .filter((one) => one.items >= 3)
            .slice(0, 60)
            .map((one) => ({
              url: `${site}/skincare?shelf=${encodeURIComponent(one.name)}`,
              changeFrequency: "weekly" as const,
              priority: 0.6,
            })),
        ]
      : [];

    // The same again for the pharmacy counter. "Paracetamol delivered in
    // Lagos" is the same kind of search as "CeraVe delivered in Lagos", and
    // a shelf page answers it better than eight hundred product pages
    // nobody would ever crawl.
    const drugFacets = await pharmacyFacets().catch(() => ({ shelves: [], brands: [] }));
    const pharmacy = pharmacyOn(await safeSettings())
      ? [
          ...drugFacets.brands
            .filter((one) => one.items >= 3)
            .slice(0, 120)
            .map((one) => ({
              url: `${site}/pharmacy?brand=${encodeURIComponent(one.name)}`,
              changeFrequency: "weekly" as const,
              priority: 0.6,
            })),
          ...drugFacets.shelves
            .filter((one) => one.items >= 3)
            .slice(0, 60)
            .map((one) => ({
              url: `${site}/pharmacy?shelf=${encodeURIComponent(one.name)}`,
              changeFrequency: "weekly" as const,
              priority: 0.6,
            })),
        ]
      : [];

    return [
      ...home,
      ...skincare,
      ...pharmacy,
      ...packed
        .filter((one) => one.slug)
        .map((one) => ({
          url: `${site}/collections/${one.slug}`,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
      ...food.map((one) => ({
        // The name, not the id: the id is a second address for the same page,
        // and a sitemap that disagrees with every link on the site splits
        // what each of them is worth.
        url: `${site}/r/${one.slug || one.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...items.map((item) => ({
        url: `${site}/p/${item.slug || item.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return home;
  }
}
