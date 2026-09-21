import { NextResponse } from "next/server";
import { orderFromLink } from "@/app/actions";
import { tokenFor } from "@/lib/customer-auth";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Ordering off a link, from the app.
 *
 * The same server action the website calls, so which swap they took, what it
 * costs and which car it goes in are all decided in one place.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      hostel?: string;
      note?: string;
      paymentMethod?: string;
      instead?: number;
    };

    const result = await orderFromLink({
      code: (await params).code,
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      hostel: String(body.hostel ?? ""),
      note: String(body.note ?? "").slice(0, 300),
      paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
      instead: Math.max(0, Math.round(Number(body.instead) || 0)),
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
