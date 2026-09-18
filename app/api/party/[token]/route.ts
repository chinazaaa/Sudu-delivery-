import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { groupOrders } from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * Who is in a party, for the bar that follows somebody round the site.
 *
 * A token means nothing until the first person in it orders, so this answers
 * honestly before that: nobody has ordered yet. Once somebody has, it can say
 * whose group it is and how many are in it, which is what makes the rest of
 * the site stop feeling like ordering alone.
 *
 * First names only. A group link gets pasted into a chat, so anybody with it
 * can read this, and it must not hand out numbers or addresses.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { data } = await db()
      .from("order_groups")
      .select("id, leader_name, closes_at, closed_at, batch_id")
      .eq("party_token", (await params).token)
      .maybeSingle();

    if (!data) return NextResponse.json({ started: false });

    const orders = await groupOrders(data.id as string);
    const { data: batch } = await db()
      .from("batches")
      .select("delivery_window_text, kind")
      .eq("id", data.batch_id as string)
      .maybeSingle();

    return NextResponse.json({
      when: (batch?.delivery_window_text as string) ?? "",
      sameDay: batch?.kind === "same_day",
      started: true,
      id: data.id,
      leader: String(data.leader_name ?? "").split(" ")[0],
      people: orders.length,
      names: orders.map((one) => (one.for_name ?? one.customer_name).split(" ")[0]),
      closesAt: data.closes_at,
      closed: data.closed_at !== null,
    });
  } catch {
    return NextResponse.json({ started: false });
  }
}
