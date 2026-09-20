import { NextResponse } from "next/server";
import { seatFrom } from "@/lib/seat";
import { joinableGroup, startGroupClock } from "@/lib/groups";
import { finaliseSeat, saveSeatDetails } from "@/lib/group-carts";
import { normalisePhone } from "@/lib/phone";
import type { CartLine } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * "This is my food, and here is where it goes."
 *
 * Finishing is one step, not two. Saying you are done and then being left in
 * a waiting room that wants a phone number is the same question asked twice,
 * so the number and the block are part of finishing.
 *
 * No money is named and nothing is charged: the delivery fee still depends on
 * who else ends up in the car. All this settles is the food and the address,
 * which is everything needed to make an order the moment a fee exists.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const id = (await params).id;
  const group = await joinableGroup(id);
  if (!group) {
    return NextResponse.json({ error: "That group has closed." }, { status: 404 });
  }

  const token = await seatFrom(request);
  if (!token) {
    return NextResponse.json({ error: "Join the group first." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    lines?: CartLine[];
    phone?: string;
    hostel?: string;
    note?: string;
    paymentMethod?: string;
  };

  const lines = Array.isArray(body.lines) ? body.lines.filter((l) => l.qty > 0) : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const phone = normalisePhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json(
      { error: "That phone number doesn't look right. It is how we call you." },
      { status: 400 }
    );
  }

  const hostel = String(body.hostel ?? "").trim();
  if (hostel === "") {
    return NextResponse.json({ error: "Which block does it go to?" }, { status: 400 });
  }

  // Both, or neither. Saving the food and then failing on the address would
  // leave somebody finished with nowhere for it to go, which is the state
  // this whole step exists to avoid.
  const saved = await finaliseSeat({ groupId: group.id, token, lines });
  if (!saved) {
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }

  const ok = await saveSeatDetails({
    groupId: group.id,
    token,
    phone,
    hostel,
    note: String(body.note ?? "").trim().slice(0, 300),
    paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
  });
  if (!ok) return NextResponse.json({ error: "Could not save that." }, { status: 500 });

  // The quarter of an hour runs from the first person finishing, not from the
  // link being made: the leader would otherwise be racing a clock that
  // started while they were still reading the menu.
  await startGroupClock(group.id);

  return NextResponse.json({ ok: true });
}
