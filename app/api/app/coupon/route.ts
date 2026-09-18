import { NextResponse } from "next/server";
import { previewCoupon } from "@/lib/orders";
import type { CartLine } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * What a code is worth on this cart, before anybody commits to it.
 *
 * The same check the order itself runs, so a code that reads as ₦500 off here
 * takes ₦500 off there, and one that will be refused says so now rather than
 * at the moment somebody presses Place order.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      code?: string;
      batchId?: string;
      phone?: string;
      lines?: CartLine[];
    };

    const result = await previewCoupon({
      code: String(body.code ?? "").trim(),
      batchId: String(body.batchId ?? ""),
      phone: String(body.phone ?? ""),
      lines: Array.isArray(body.lines) ? body.lines : [],
    });

    return result.ok
      ? NextResponse.json({ discount: result.discount, label: result.label })
      : NextResponse.json({ error: result.error }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Could not check that code." }, { status: 500 });
  }
}
