import { db } from "./supabase";

/** The promoter behind a ?ref= code, if it is a live one. */
export async function activePromoter(
  code: string | null | undefined
): Promise<{ code: string; name: string } | null> {
  if (!code) return null;
  const { data } = await db()
    .from("promoters")
    .select("code, name")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();
  return data ? { code: data.code as string, name: data.name as string } : null;
}
