import { NextResponse } from "next/server";
import { aisleTiles, everyAisleTile, featuredTile, kitchenTiles } from "@/lib/aisle-tiles";

export const dynamic = "force-dynamic";

/**
 * The menu screen, as the website's menu page draws it: a tile for every
 * aisle, the promoted collection near the end, and the kitchens by most
 * ordered. The same functions the website reads, so the two cannot differ.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const [starters, more, featured, kitchens] = await Promise.all([
      aisleTiles(),
      everyAisleTile(),
      featuredTile(),
      kitchenTiles(),
    ]);
    const tile = (one: { aisle: string; from: number; image: string }) => ({
      label: one.aisle,
      from: one.from,
      image: one.image,
    });
    return NextResponse.json({
      tiles: starters.map(tile),
      more: more.map(tile),
      featured: featured
        ? { label: featured.aisle, from: featured.from, image: featured.image, slug: featured.href.split("/").pop() ?? "" }
        : null,
      kitchens: kitchens.map((one) => ({
        id: one.id,
        name: one.name,
        from: one.from,
        image: one.image,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the menu." },
      { status: 503 }
    );
  }
}
