import { NextResponse } from "next/server";

import { deliveryFor } from "@/lib/shop-delivery";

export const dynamic = "force-dynamic";

/** When each of these counters next delivers, for the cart-side notices. */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((one) => one.trim())
    .filter(Boolean)
    .slice(0, 30);
  try {
    return NextResponse.json({ days: await deliveryFor(ids) });
  } catch {
    return NextResponse.json({ days: {} });
  }
}
