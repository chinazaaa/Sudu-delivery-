import { NextResponse } from "next/server";
import { existingLoad } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { phoneFromToken } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Whether this number already has an order on a run, and what it has paid in
 * delivery so far.
 *
 * Adding to an order already placed costs only the difference in delivery,
 * never a second fee. The website works this out at checkout; the app asks
 * here, so the rule stays in one place.
 *
 * The number comes from the signed token where there is one. Without a token
 * a typed number is accepted, because somebody ordering for the first time on
 * this phone has nothing to prove yet, and the answer is only a count and a
 * fee for a number they have typed themselves.
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
      items: load.items,
      feeCharged: load.feeCharged,
      name: load.orders[0]?.customer_name ?? "",
      hostel: load.orders[0]?.hostel ?? "",
    });
  } catch {
    // A checkout must never be held up by this: not knowing simply means the
    // ordinary fee, which is what would have been charged anyway.
    return NextResponse.json({ items: 0, feeCharged: 0 });
  }
}
