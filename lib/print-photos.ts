import { unstable_cache } from "next/cache";
import { db } from "./supabase";

/**
 * Our own photographs of the printing services, by slug.
 *
 * Read in one go and cached, because the catalogue page shows two hundred
 * of them and asking per item would be two hundred queries for a page that
 * mostly has nothing to show yet.
 */
export const printPhotos = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await db().from("print_photos").select("slug, url");
    // Before the migration there is no table, and no photographs is the
    // right answer then rather than a page that will not render.
    if (error) return {};
    return Object.fromEntries(
      ((data ?? []) as { slug: string; url: string }[])
        .filter((one) => one.url !== "")
        .map((one) => [one.slug, one.url])
    );
  },
  ["print-photos"],
  { revalidate: 300, tags: ["print-photos"] }
);
