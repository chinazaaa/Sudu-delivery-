import { NextResponse } from "next/server";

import { forgetCustomer } from "@/lib/forget";
import { phoneFromToken } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Delete everything that says who somebody is.
 *
 * Both app stores require a person to be able to get rid of their own record
 * from inside the app, and it is the right thing anyway. What goes is
 * everything that identifies them: the customer record with their name,
 * block and PIN, any phone registered for notifications, any cart they left
 * behind, and their name and number on past orders and groups.
 *
 * What stays is the bare record of past sales with no name on it, because we
 * have to be able to account for money that changed hands. That is exactly
 * what the privacy policy promises.
 *
 * It is refused only while food is actually in flight. An order paid for and
 * not yet handed out still has to reach somebody, and a bag with no name on
 * it reaches nobody. They are told to come back once it has arrived, which
 * is a wait of hours, not a refusal.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const header = request.headers.get("authorization");
  const phone = phoneFromToken(header?.replace(/^Bearer /i, "") ?? null);
  if (!phone) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const done = await forgetCustomer(phone, "the app");
  if (done.ok) return NextResponse.json({ ok: true, orders: done.orders });

  return NextResponse.json(
    { error: done.error },
    { status: done.stillComing ? 409 : 500 }
  );
}
