import { NextResponse } from "next/server";
import { getOrder, moveOrder } from "@/lib/orders";
import { phoneFromToken } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Put an order on another run, from the app.
 *
 * The app could only say "message us to move it", which is a WhatsApp message
 * somebody has to answer by hand at the exact moment they are driving. The
 * rule is the same one the website moves orders by: an unpaid order is
 * repriced against today's menu and the new run's band, and a paid one keeps
 * what it paid.
 *
 * Only your own order. The token carries the number the order was made on,
 * and anything else is somebody moving a stranger's dinner.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const phone = phoneFromToken(
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null
  );
  if (!phone) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "No such order." }, { status: 404 });
    if (order.customer_phone !== phone) {
      return NextResponse.json({ error: "That is not your order." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { batchId?: string };
    const result = await moveOrder(order.id, String(body.batchId ?? ""));

    return result.ok
      ? NextResponse.json({ ok: true, orderId: result.orderId })
      : NextResponse.json({ error: result.error }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not move that order." },
      { status: 500 }
    );
  }
}
