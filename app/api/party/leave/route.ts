import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Leaving a group, or having just ordered in one.
 *
 * Their seat goes with them. A group that kept the food of somebody who had
 * walked away would price the car on it and split the fee that many ways, so
 * everybody else would be quietly paying a share for a person who is not
 * coming.
 *
 * Only their own seat, found by the cookie they are holding. Nobody can
 * remove anybody else.
 */
export async function POST(): Promise<NextResponse> {
  const jar = await cookies();
  const group = jar.get("sudu_group")?.value ?? "";
  const seat = jar.get("sudu_seat")?.value ?? "";

  if (group && seat) {
    // A seat that has become an order is not deleted: the group has closed,
    // the food is bought, and leaving afterwards is just tidying a cookie.
    await db()
      .from("group_carts")
      .delete()
      .eq("group_id", group)
      .eq("member_token", seat);
  }

  jar.delete("sudu_group");
  jar.delete("sudu_seat");
  return NextResponse.json({ ok: true });
}
