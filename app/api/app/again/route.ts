import { NextResponse } from "next/server";
import { phoneFromToken } from "@/lib/customer-auth";
import { lastOrderForPhone, repeatLines } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * The last order from this number, priced at today's prices.
 *
 * Rebuilt by the same code the website uses, so anything sold out is left out
 * and said out loud rather than quietly dropped into somebody's cart.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const phone = phoneFromToken(
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null
  );
  if (!phone) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  try {
    const last = await lastOrderForPhone(phone);
    if (!last) return NextResponse.json({ lines: [], blocked: [] });

    const repeat = await repeatLines(last);
    return NextResponse.json({
      lines: repeat.lines.map((line) => ({
        itemId: line.itemId,
        optionIds: line.optionIds,
        name: line.name,
        restaurant: line.restaurantName,
        imageUrl: line.imageUrl,
        unitPrice: line.unitPrice,
        qty: line.qty,
        choices: line.choices,
      })),
      blocked: repeat.blocked,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not rebuild that order." },
      { status: 500 }
    );
  }
}
