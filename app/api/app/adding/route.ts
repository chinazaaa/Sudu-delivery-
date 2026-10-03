import { NextResponse } from "next/server";
import { existingLoad } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { phoneFromToken } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Who an order on this run is for, so the app can fill the checkout in.
 *
 * It used to answer with the containers already on the run and the delivery
 * charged on them, because a second order on the same number paid only the
 * difference. That is gone: anybody with an order in a run could put a
 * friend's food on their number and the friend's delivery came to nothing,
 * and an order left unpaid handed its fee to the next one as credit that had
 * never arrived. Every order now pays for the room its own containers take.
 *
 * The counts still come back as zero rather than disappearing, because an app
 * already on somebody's phone prices off them: zero means it charges the
 * ordinary fee, which is the new rule, without waiting for an update. A
 * discount the shop decides to give on a message is given by hand on the
 * order, where there is somebody to decide it.
 *
 * The number comes from the signed token where there is one. Without a token
 * a typed number is accepted, because somebody ordering for the first time on
 * this phone has nothing to prove yet, and the answer is only a name and a
 * block for a number they have typed themselves.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const batchId = url.searchParams.get("batchId") ?? "";
    const header = request.headers.get("authorization");
    const signed = phoneFromToken(header?.replace(/^Bearer /i, "") ?? null);
    const phone = signed ?? normalisePhone(url.searchParams.get("phone") ?? "");

    if (!batchId || !phone) return NextResponse.json({ items: 0, feeCharged: 0 });

    const load = await existingLoad(batchId, phone);
    return NextResponse.json({
      items: 0,
      feeCharged: 0,
      name: load.orders[0]?.customer_name ?? "",
      hostel: load.orders[0]?.hostel ?? "",
    });
  } catch {
    // A checkout must never be held up by this: not knowing simply means the
    // ordinary fee, which is what would have been charged anyway.
    return NextResponse.json({ items: 0, feeCharged: 0 });
  }
}
