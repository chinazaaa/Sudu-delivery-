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
      /** An ISO time when they picked one, which makes its own trip. */
      deliverAt?: string;
      name?: string;
      phone?: string;
      hostel?: string;
      lines?: CartLine[];
      coupon?: string;
      paymentMethod?: string;
      /** "GBP" or "USD" on a card, where somebody abroad is paying. */
      payCurrency?: string;
      customerNote?: string;
      heardFrom?: string;
      groupMode?: string;
      collectMode?: string;
      people?: { name?: string; phone?: string; hostel?: string; pays?: string }[];
    };

    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) {
      return NextResponse.json({ error: "There is nothing in that cart." }, { status: 400 });
    }

    const result = await placeOrder({
      source: "app",
      batchId: String(body.batchId ?? ""),
      // Same day from a phone is the same trip as from the web: placeOrder
      // checks the time against the real clock and makes the batch itself.
      deliverAt: String(body.deliverAt ?? "").trim() || undefined,
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      hostel: String(body.hostel ?? ""),
      lines,
      coupon: String(body.coupon ?? "").trim(),
      // A group from the app is the same group as one from the web: the same
      // splitting, the same fee shared out, the same rules about who pays.
      groupMode:
        body.groupMode === "one_payer" || body.groupMode === "split" ? body.groupMode : null,
      paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
      // Only a card link can be made out in anybody else's money, and only
      // in one the shop actually offers. Read here rather than trusted: a
      // phone can say a currency, it cannot choose one.
      payCurrency:
        body.paymentMethod === "card" &&
        (body.payCurrency === "GBP" || body.payCurrency === "USD")
          ? body.payCurrency
          : undefined,
      collectMode: body.collectMode === "each" ? "each" : "leader",
      people: (Array.isArray(body.people) ? body.people : []).map((person) => ({
        name: String(person.name ?? "").trim(),
        phone: String(person.phone ?? "").trim(),
        hostel: String(person.hostel ?? "").trim(),
        pays: person.pays === "card" ? ("card" as const) : ("transfer" as const),
      })),
      customerNote: String(body.customerNote ?? "").trim().slice(0, 300),
      heardFrom: String(body.heardFrom ?? "").trim(),
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
