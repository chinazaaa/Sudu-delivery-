import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { joinableGroup } from "@/lib/groups";
import { finaliseSeat } from "@/lib/group-carts";
import type { CartLine } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * "This is my food, I am done choosing."
 *
 * The second of the three moments. No money is named and nothing is charged:
 * the delivery fee still depends on who else ends up in the car. All this
 * says is that the food is settled, which is what the others are waiting on.
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

  const token = (await cookies()).get("sudu_seat")?.value ?? "";
  if (!token) {
    return NextResponse.json({ error: "Join the group first." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { lines?: CartLine[] };
  const lines = Array.isArray(body.lines) ? body.lines.filter((l) => l.qty > 0) : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const ok = await finaliseSeat({ groupId: group.id, token, lines });
  if (!ok) return NextResponse.json({ error: "Could not save that." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
