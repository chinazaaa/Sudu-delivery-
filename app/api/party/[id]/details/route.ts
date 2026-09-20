import { NextResponse } from "next/server";
import { seatFrom } from "@/lib/seat";
import { joinableGroup } from "@/lib/groups";
import { saveSeatDetails } from "@/lib/group-carts";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Where the food goes, filled in while they wait.
 *
 * The third moment, and the one that used to come first. A number and a block
 * are what delivery needs, not what choosing needs, so they are asked for in
 * the dead time after somebody has finished and before the last person has.
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

  const ok = await saveSeatDetails({
    groupId: group.id,
    token,
    phone,
    hostel,
    note: String(body.note ?? "").trim().slice(0, 300),
    paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
  });

  if (!ok) return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
