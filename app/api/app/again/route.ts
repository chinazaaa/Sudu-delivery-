import { NextResponse } from "next/server";
import { phoneFromToken } from "@/lib/customer-auth";
import { lastOrderForPhone, repeatLines } from "@/lib/orders";
import { boxWhere } from "@/lib/boxes";

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

    // A box is not a cart. Its price is the box's price with delivery
    // already in it, so putting its contents into an ordinary cart would
    // charge the container ladder for a thing never priced that way. The
    // website sends them back to the box; so does this. Null once the box
    // or its shelf is gone, and then the ordinary repeat still works.
    const boxId = (last as { box_id?: string | null }).box_id;
    const sameBox = boxId ? await boxWhere(String(boxId)).catch(() => null) : null;

    const repeat = await repeatLines(last);
    return NextResponse.json({
      // What they asked for last time and how they paid, so the form comes
      // up filled in and the only thing left is the button.
      carry: {
        note: (last as { customer_note?: string | null }).customer_note ?? "",
        method:
          (last as { payment_method?: string }).payment_method === "card"
            ? "card"
            : "transfer",
      },
      box: sameBox ? { name: sameBox.name, slug: sameBox.slug } : null,
      lines: repeat.lines.map((line) => ({
        itemId: line.itemId,
        optionIds: line.optionIds,
        name: line.name,
        restaurant: line.restaurantName,
        imageUrl: line.imageUrl,
        unitPrice: line.unitPrice,
        qty: line.qty,
        choices: line.choices,
        containerPct: line.containerPct,
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
