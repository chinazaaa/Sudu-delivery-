import { NextResponse } from "next/server";

import { homeTileDefs } from "@/lib/aisle-tiles";
import { kindShops, type AisleShop } from "@/lib/products";
import { deliveryFor } from "@/lib/shop-delivery";

/** Each shop with the day its food next arrives. A failure is no pill, never an error. */
async function withDays(shops: AisleShop[]): Promise<AisleShop[]> {
  try {
    const days = await deliveryFor(shops.map((one) => one.id));
    return shops.map((one) => ({ ...one, delivery: days[one.id] }));
  } catch {
    return shops;
  }
}

export const dynamic = "force-dynamic";

/** The shops and dishes behind one tile, aisle, word or category, for the picker. */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams;
  const tile = asked.get("tile") ?? "";
  if (tile !== "") {
    const found = (await homeTileDefs()).find((one) => one.label === tile);
    return NextResponse.json({
      shops: found
        ? await withDays(await kindShops({ sources: found.sources, shops: found.shops, first: found.first }))
        : [],
    });
  }
  return NextResponse.json({
    shops: await withDays(
      await kindShops({
        aisle: asked.get("aisle") ?? "",
        q: asked.get("q") ?? "",
        category: asked.get("category") ?? "",
      })
    ),
  });
}
