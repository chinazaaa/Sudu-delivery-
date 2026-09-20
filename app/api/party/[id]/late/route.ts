import { NextResponse } from "next/server";
import { seatFrom } from "@/lib/seat";
import { db } from "@/lib/supabase";
import { getSharedGroup, groupOrders } from "@/lib/groups";
import { seatFor } from "@/lib/group-carts";
import { orderLinkId, placeOrder } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Finishing after the group has closed.
 *
 * The clock runs out on people. Somebody who had chosen their food but never
 * gave a number has a seat, a cart and nowhere for any of it to go, and the
 * close cannot make an order out of that. Their food is left where it is
 * rather than thrown away, and this is how they finish.
 *
 * They pay what everybody else was told to pay. The share was worked out when
 * the group closed and is not recalculated here: the others have already been
 * given a figure, and a late arrival must not move it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const id = (await params).id;
  const group = await getSharedGroup(id);
  if (!group?.closed_at) {
    return NextResponse.json({ error: "That group is still open." }, { status: 400 });
  }

  const token = await seatFrom(request);
  const seat = token ? await seatFor(group.id, token) : null;
  if (!seat || seat.lines.length === 0) {
    return NextResponse.json({ error: "There is no food waiting for you." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    hostel?: string;
    note?: string;
    paymentMethod?: string;
  };

  const phone = normalisePhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json(
      { error: "That phone number doesn't look right." },
      { status: 400 }
    );
  }
  const hostel = String(body.hostel ?? "").trim();
  if (hostel === "") {
    return NextResponse.json({ error: "Which block does it go to?" }, { status: 400 });
  }

  // What everybody else in this car was charged. Read from an order rather
  // than worked out again, so one number covers the whole car however late
  // this arrives.
  const made = await groupOrders(group.id);
  // Nobody in the car got as far as an order, so there is no share to match.
  // Falling back to nought made the first person to come back the only one
  // who ever got free delivery, which is not a gift anybody meant to give:
  // with no share to copy, their food is priced like any other order.
  const share = made[0]?.fee ?? null;

  const result = await placeOrder({
    batchId: group.batch_id,
    name: seat.name,
    phone,
    hostel,
    lines: seat.lines,
    coupon: seat.coupon || undefined,
    // What they have just said, falling back to whatever the seat carried.
    paymentMethod:
      body.paymentMethod === "card" || body.paymentMethod === "transfer"
        ? body.paymentMethod
        : seat.payment_method === "card"
          ? "card"
          : "transfer",
    customerNote: String(body.note ?? "").trim().slice(0, 300),
    fixedFee: share ?? undefined,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // It is an order now, so the seat goes. Leaving it would put them back in
  // this same state on the next page load.
  await db().from("group_carts").delete().eq("id", seat.id);
  await db().from("orders").update({ group_id: group.id }).eq("id", result.orderId);

  // The short code, because this id goes straight into the address bar.
  return NextResponse.json({ ok: true, orderId: await orderLinkId(result.orderId) });
}
