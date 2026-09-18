import { NextResponse } from "next/server";
import { rememberCart } from "@/lib/carts";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * A cart in the app, kept behind the number typed at checkout.
 *
 * The same table the website writes to, on purpose. Abandoned carts are a list
 * of people to ring, and a person is a person whichever thing they were
 * holding, so splitting them in two would only mean checking two lists.
 *
 * The row is keyed on the number and the run, so somebody who fills a cart on
 * the website and again in the app is one person to chase, not two. Whichever
 * they touched last is what is remembered, which is also the one they were
 * actually looking at.
 *
 * Answers 204 whatever happens. A checkout must never fail because the note
 * about it could not be filed.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      phone?: unknown;
      name?: unknown;
      hostel?: unknown;
      batchId?: unknown;
      items?: unknown;
      value?: unknown;
      summary?: unknown;
    };

    const phone = normalisePhone(String(body.phone ?? ""));
    const items = Number(body.items ?? 0);

    // No number is nobody to chase, and an empty cart is nothing to chase
    // them about. Exactly the two guards the website uses.
    if (phone && Number.isFinite(items) && items > 0) {
      await rememberCart({
        phone,
        name: String(body.name ?? "").trim(),
        hostel: String(body.hostel ?? "").trim(),
        batchId: String(body.batchId ?? "") || null,
        items: Math.round(items),
        value: Math.round(Number(body.value ?? 0)) || 0,
        summary: String(body.summary ?? "").slice(0, 500),
      });
    }
  } catch {
    /* Filing the note is the least important thing this server does. */
  }

  return new NextResponse(null, { status: 204 });
}
