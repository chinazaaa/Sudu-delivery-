import { NextResponse } from "next/server";

import { homeTileDefs } from "@/lib/aisle-tiles";
import { kindShops } from "@/lib/products";

export const dynamic = "force-dynamic";

/** The shops and dishes behind one tile, aisle, word or category, for the picker. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams;
  const tile = asked.get("tile") ?? "";
  if (tile !== "") {
    const found = (await homeTileDefs()).find((one) => one.label === tile);
    return NextResponse.json({
      shops: found ? await kindShops({ sources: found.sources, shops: found.shops }) : [],
    });
  }
  return NextResponse.json({
    shops: await kindShops({
      aisle: asked.get("aisle") ?? "",
      q: asked.get("q") ?? "",
      category: asked.get("category") ?? "",
    }),
  });
}
