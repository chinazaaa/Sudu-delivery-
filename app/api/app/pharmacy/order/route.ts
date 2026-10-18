import { NextResponse } from "next/server";
import { placeSkincareOrder } from "@/app/actions";
import { tokenFor } from "@/lib/customer-auth";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * A pharmacy order from the app, placed by the same code as the website's.
 *
 * The phone sends what it has in its basket and who it is; everything that
 * decides money, the prices, the ladder, which car it goes on, is worked
 * out here. A phone cannot talk itself into a cheaper order, and it cannot
 * talk itself onto a car that is not running either.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      lines?: { id?: string; qty?: number }[];
      name?: string;
      phone?: string;
      hostel?: string;
      note?: string;
      paymentMethod?: string;
      heardFrom?: string;
      payCurrency?: string;
      deliverAt?: string;
    };

    const result = await placeSkincareOrder({
      counter: "pharmacy",
      lines: (Array.isArray(body.lines) ? body.lines : []).map((one) => ({
        id: String(one.id ?? ""),
        qty: Math.max(1, Math.round(Number(one.qty) || 1)),
      })),
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      hostel: String(body.hostel ?? ""),
      note: String(body.note ?? "").slice(0, 300),
      paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
      heardFrom: String(body.heardFrom ?? "").trim(),
      payCurrency:
        body.paymentMethod === "card" &&
        (body.payCurrency === "GBP" || body.payCurrency === "USD")
          ? body.payCurrency
          : undefined,
      // A time means a car of its own today or tomorrow. Checked against the
      // real clock there, because a phone left open since this morning is
      // still offering this morning's times.
      deliverAt: String(body.deliverAt ?? "").trim() || undefined,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

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
