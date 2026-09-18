import { NextResponse } from "next/server";
import { saveRating } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * How a delivered order went: five stars and, if they want, a line.
 *
 * The website asks through a form action, which a phone cannot call, so this
 * is the same question over HTTP. Both go through `saveRating`, so what counts
 * as an answer is decided once.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      rating?: number;
      feedback?: string;
    };

    const { error } = await saveRating(
      String(body.orderId ?? ""),
      Number(body.rating ?? 0),
      String(body.feedback ?? "")
    );
    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save that." },
      { status: 500 }
    );
  }
}
