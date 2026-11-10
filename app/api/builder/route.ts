import { NextResponse } from "next/server";

import { kindShops } from "@/lib/products";

export const dynamic = "force-dynamic";

/** The shops and dishes behind one aisle, word or category, for the picker. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams;
  return NextResponse.json({
    shops: await kindShops({
      aisle: asked.get("aisle") ?? "",
      q: asked.get("q") ?? "",
      category: asked.get("category") ?? "",
    }),
  });
}
