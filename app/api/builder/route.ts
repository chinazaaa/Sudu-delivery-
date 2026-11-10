import { NextResponse } from "next/server";

import { aisleShops } from "@/lib/products";

export const dynamic = "force-dynamic";

/** The shops and dishes behind one aisle, for the step-by-step picker. */
export async function GET(request: Request) {
  const aisle = new URL(request.url).searchParams.get("aisle") ?? "";
  return NextResponse.json({ shops: await aisleShops(aisle) });
}
