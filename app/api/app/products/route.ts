import { NextResponse } from "next/server";

import { browseProducts, productFacets, PER_PAGE } from "@/lib/products";

export const dynamic = "force-dynamic";

/**
 * Everything the shop sells, a page at a time, with what there is to narrow
 * by. The same two functions the website's list uses, so the two cannot
 * drift into showing different things.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const asked = new URL(request.url).searchParams;
    const place = asked.get("place") ?? "";
    const sort = asked.get("sort") ?? "";

    const [{ products, total }, facets] = await Promise.all([
      browseProducts({
        query: asked.get("q") ?? "",
        place,
        category: asked.get("category") ?? "",
        sort: sort === "cheap" || sort === "dear" ? sort : "",
        page: Math.max(1, Number(asked.get("page") ?? 1) || 1),
      }),
      productFacets(place || undefined),
    ]);

    return NextResponse.json({ products, total, perPage: PER_PAGE, ...facets });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the menu." },
      { status: 500 }
    );
  }
}
