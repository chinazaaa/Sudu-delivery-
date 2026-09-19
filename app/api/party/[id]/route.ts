import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/supabase";
import { groupOrders } from "@/lib/groups";
import { cartValues, groupCarts, isReady } from "@/lib/group-carts";
import { shareNow } from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * Who is in a group, for the bar that follows somebody round the site.
 *
 * First names only. A group link gets pasted into a chat, so anybody with it
 * can read this, and it must not hand out numbers or addresses.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { data } = await db()
      .from("order_groups")
      .select("id, leader_name, closes_at, closed_at, batch_id")
      .eq("id", (await params).id)
      .maybeSingle();

    if (!data) return NextResponse.json({ started: false });

    // Before it closes the people are seats, not orders: there are no orders
    // until there is a delivery fee to put on one.
    const closed = data.closed_at !== null;
    const seats = closed ? [] : await groupCarts(data.id as string);
    const orders = closed ? await groupOrders(data.id as string) : [];
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
      people: closed ? orders.length : seats.length,
      names: closed
        ? orders.map((one) => (one.for_name ?? one.customer_name).split(" ")[0])
        : seats.map((one) => one.name.split(" ")[0]),
      ready: closed ? orders.length : seats.filter(isReady).length,
      eachNow: closed ? 0 : (await shareNow(data.id as string)).each,
      // What everybody has put in, so the cart page can show the whole car
      // rather than only the part of it this person is holding.
      //
      // First names and food only. A group link gets pasted into a chat, so
      // anybody with it can read this, and it must not hand out numbers,
      // addresses or what anybody is paying.
      members: closed
        ? []
        : await (async () => {
            const worth = await cartValues(seats);
            const token = (await cookies()).get("sudu_seat")?.value ?? "";
            return seats.map((seat) => ({
              // So a page can leave the reader out of a list of other people.
              isMine: token !== "" && seat.member_token === token,
              name: seat.name.split(" ")[0],
              items: seat.lines.reduce((sum, line) => sum + (line.qty ?? 0), 0),
              food: worth.get(seat.id)?.value ?? 0,
              summary: worth.get(seat.id)?.summary ?? "",
              lines: worth.get(seat.id)?.lines ?? [],
              ready: isReady(seat),
            }));
          })(),
      closesAt: data.closes_at,
      closed: data.closed_at !== null,
    });
  } catch {
    return NextResponse.json({ started: false });
  }
}
