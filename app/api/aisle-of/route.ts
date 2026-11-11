import { NextResponse } from "next/server";

import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** The aisle a dish is filed under, so a swap can offer the same kind of food. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("item") ?? "";
  if (id === "") return NextResponse.json({ aisle: "" });
  const { data: item } = await db().from("menu_items").select("category_id").eq("id", id).maybeSingle();
  const category = (item as { category_id?: string } | null)?.category_id;
  if (!category) return NextResponse.json({ aisle: "" });
  const { data: cat } = await db().from("menu_categories").select("aisle").eq("id", category).maybeSingle();
  return NextResponse.json({ aisle: String((cat as { aisle?: string } | null)?.aisle ?? "").trim() });
}
