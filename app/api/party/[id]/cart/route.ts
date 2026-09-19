import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/supabase";
import { joinableGroup } from "@/lib/groups";
import type { CartLine } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * What somebody has in their cart right now, shared with the car.
 *
 * A group cart that only shows what people have finished choosing is not a
 * group cart: everybody sits there saying "still choosing" until the moment
 * they are done, which is exactly when looking stops being useful. Deciding
 * whether to add a drink means seeing that somebody has ordered a pizza.
 *
 * So the food is shared as it is chosen. It is not finalised by this: nothing
 * here says they are done, and nothing is priced or ordered. It is a window
 * into a cart, which is what the others actually want.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const group = await joinableGroup((await params).id);
  if (!group) return NextResponse.json({ ok: false }, { status: 404 });

  const token = (await cookies()).get("sudu_seat")?.value ?? "";
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { lines?: CartLine[] };
  const lines = Array.isArray(body.lines) ? body.lines.filter((l) => l.qty > 0) : [];

  // Only the food. finalised_at is deliberately untouched: somebody who has
  // said they are done and then changes their mind has to say so again.
  await db()
    .from("group_carts")
    .update({ lines, updated_at: new Date().toISOString() })
    .eq("group_id", group.id)
    .eq("member_token", token);

  return NextResponse.json({ ok: true });
}
