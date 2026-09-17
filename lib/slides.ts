import { db } from "./supabase";

export type Slide = {
  id: string;
  headline: string;
  body: string;
  image_url: string;
  link_url: string;
  link_text: string;
  active: boolean;
  sort_order: number;
};

/**
 * The home page slider. With nothing here the page falls back to a slide per
 * restaurant, so a new shop still looks like a shop rather than an empty
 * frame waiting to be filled in.
 */
export async function listSlides(includeHidden = false): Promise<Slide[]> {
  return (await readSlides(includeHidden)).slides;
}

/**
 * The same, plus whether the table is actually there.
 *
 * Admin needs the difference. No slides yet and no slides table look
 * identical from here, but one of them means the next thing you do will
 * fail, so it is worth saying which you are looking at.
 */
export async function readSlides(
  includeHidden = false
): Promise<{ slides: Slide[]; ready: boolean }> {
  try {
    let query = db().from("slides").select("*").order("sort_order").order("created_at");
    if (!includeHidden) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { slides: (data ?? []) as Slide[], ready: true };
  } catch {
    // No table yet: the fallback slides still render.
    return { slides: [], ready: false };
  }
}
