import { NextResponse } from "next/server";
import { checkPin, tokenFor } from "@/lib/customer-auth";
import { normalisePhone } from "@/lib/phone";
import { customerDetails } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/** Phone and PIN in, a token out. The same PIN that opens their orders on the
 *  web, with the same five-tries-and-wait behind it. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { phone?: string; pin?: string };
    const phone = normalisePhone(String(body.phone ?? ""));
    const pin = String(body.pin ?? "").trim();

    if (!phone) return NextResponse.json({ error: "That number does not look right." }, { status: 400 });
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "The PIN is four digits." }, { status: 400 });

    const result = await checkPin(phone, pin);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });

    const details = await customerDetails(phone);
    return NextResponse.json({
      token: tokenFor(phone),
      phone,
      name: details?.name ?? "",
      hostel: details?.hostel ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Could not sign you in." }, { status: 500 });
  }
}
