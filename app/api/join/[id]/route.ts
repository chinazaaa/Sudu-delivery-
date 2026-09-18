import { NextResponse } from "next/server";
import { deliveryLoad, rootOrder } from "@/lib/orders";
import { openGroupFor } from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * What joining this delivery would cost, for the checkout page.
 *
 * Only ever says how much is already in the car and how much has been paid to
 * carry it. No name, no number, nothing about who ordered what: a join link
 * gets shared into group chats, so it must not carry anybody's details.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const order = await rootOrder((await params).id);

    const open =
      order &&
      order.batch.status === "open" &&
      order.batch.stage === "ordering" &&
      new Date(order.batch.cut_off_at).getTime() > Date.now();

    if (!order || !open) return NextResponse.json({ ok: false });

    // A shared delivery that has closed has had its fees worked out and told
    // to everybody. Letting somebody else in now would change what they owe.
    const group = await openGroupFor(order.id);
    if (!group) return NextResponse.json({ ok: false, closed: true });

    const load = await deliveryLoad(order.batch_id, order.id);
    return NextResponse.json({
      ok: true,
      id: order.id,
      // A first name only, which is what the friend was already told.
      name: order.customer_name.split(" ")[0],
      batchId: order.batch_id,
      items: load.items,
      feeCharged: load.feeCharged,
    });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
