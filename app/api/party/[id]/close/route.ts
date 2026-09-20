import { NextResponse } from "next/server";
import { closeGroup, getSharedGroup, groupOrders, leaderSeat } from "@/lib/groups";
import { groupCarts } from "@/lib/group-carts";
import { shortRef } from "@/lib/links";
import { seatFrom } from "@/lib/seat";

export const dynamic = "force-dynamic";

/**
 * Closing a shared delivery by hand, rather than waiting out the clock.
 *
 * The website does this from a server action; an app cannot call one, so the
 * same steps live here. Everything that was learnt the hard way holds:
 *
 * - only whoever made the link may close it, proved by the seat and not by
 *   knowing the group id, which everybody in the car knows
 * - a refusal comes back as a sentence, because a close that says nothing
 *   leaves a button reading "Closing…" for ever
 * - the answer carries the caller's own order, found by the number their seat
 *   gave, read before closing because closing deletes the seats
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const id = (await params).id;
  const seat = await seatFrom(request);
  if (!seat) return NextResponse.json({ error: "Join the group first." }, { status: 400 });

  const leader = await leaderSeat(id);
  if (leader !== "" && seat !== leader) {
    return NextResponse.json(
      {
        error:
          "Only whoever started this group can close it. The clock will close it anyway.",
      },
      { status: 403 }
    );
  }

  const group = await getSharedGroup(id);
  const mine = group
    ? (await groupCarts(group.id)).find((cart) => cart.member_token === seat)
    : undefined;
  const phone = mine?.phone ?? "";

  const result = await closeGroup(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const theirs =
    group && phone
      ? (await groupOrders(group.id)).find((order) => order.customer_phone === phone)
      : undefined;

  return NextResponse.json({
    ok: true,
    share: result.share,
    people: result.people,
    orderId: theirs ? shortRef(theirs) : null,
  });
}
