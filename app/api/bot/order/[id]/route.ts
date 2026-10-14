import { NextResponse } from "next/server";

import { getOrder, isGone, isPaid } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Whether the money has landed, for the chat that is watching.
 *
 * Read off the order itself rather than off anything the browser holds,
 * and it turns green the moment the order is marked paid, by whichever
 * hand did it: the inbox marking it from a bank alert, or a person doing
 * it from Orders. The chat never decides this, which is the whole point of
 * it being a question rather than a button.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ how: "gone" });

    if (isGone(order.status)) return NextResponse.json({ how: "gone" });
    if (isPaid(order.status)) {
      return NextResponse.json({
        how: "paid",
        // The receipt is a page of its own and only ever exists for money
        // that has arrived, so the link is only ever handed over here.
        receipt: `/receipt/${order.id}`,
      });
    }
    return NextResponse.json({ how: "waiting" });
  } catch {
    return NextResponse.json({ how: "waiting" });
  }
}
