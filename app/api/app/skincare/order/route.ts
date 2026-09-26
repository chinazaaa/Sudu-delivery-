import { NextResponse } from "next/server";
import { placeSkincareOrder } from "@/app/actions";
import { tokenFor } from "@/lib/customer-auth";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * A skincare order from the app, placed by the same code as the website's.
 *
 * The phone sends what it has in its basket and who it is; everything that
 * decides money, the prices, the ladder, the car that Saturday, is worked out
 * here. A phone cannot talk itself into a cheaper order.
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
    };

    const result = await placeSkincareOrder({
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
