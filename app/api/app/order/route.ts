import { NextResponse } from "next/server";
import { placeOrder } from "@/lib/orders";
import { tokenFor } from "@/lib/customer-auth";
import { normalisePhone } from "@/lib/phone";
import type { CartLine } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * An order from the app, priced and checked exactly like one from the web.
 *
 * It calls the same placeOrder, so the cart is re-priced from the database,
 * the delivery band is worked out here, a code is checked here, and a phone
 * cannot talk itself into a cheaper order.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      batchId?: string;
      name?: string;
      phone?: string;
      hostel?: string;
      lines?: CartLine[];
      coupon?: string;
      paymentMethod?: string;
      customerNote?: string;
    };

    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "There is nothing in that cart." }, { status: 400 });
    }

    const result = await placeOrder({
      batchId: String(body.batchId ?? ""),
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      hostel: String(body.hostel ?? ""),
      lines,
      coupon: String(body.coupon ?? "").trim(),
      groupMode: null,
      paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
      collectMode: "leader",
      people: [],
      customerNote: String(body.customerNote ?? "").trim().slice(0, 300),
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // A token for the number that just ordered, so the app can ask after its
    // own orders and bind notifications to this phone without a sign in.
    const phone = normalisePhone(String(body.phone ?? ""));
    return NextResponse.json({
      orderId: result.orderId,
      token: phone ? tokenFor(phone) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not place that order." },
      { status: 500 }
    );
  }
}
