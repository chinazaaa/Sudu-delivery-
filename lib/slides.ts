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
  try {
    let query = db().from("slides").select("*").order("sort_order").order("created_at");
    if (!includeHidden) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Slide[];
  } catch {
    // No table yet: the fallback slides still render.
    return [];
  }
}
