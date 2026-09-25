import { NextResponse } from "next/server";
import { phoneFromToken } from "@/lib/customer-auth";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * The app saying "this phone will take notifications".
 *
 * The number is taken from the signed token when there is one, never from the
 * body: otherwise anybody could register their phone against somebody else's
 * number and read their order news.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { token?: string; platform?: string };
    const token = String(body.token ?? "").slice(0, 200);
    if (!token.startsWith("ExponentPushToken")) {
      return NextResponse.json({ error: "That is not a push token." }, { status: 400 });
    }

    const phone =
      phoneFromToken(request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null) ?? "";

    // The number is only written when there is one. The app says hello on
    // every launch now, and a launch before anybody has signed in carries no
    // number: writing the empty string then would rub out the number a phone
    // already had, and its owner would stop hearing about their own orders.
    await db()
      .from("push_devices")
      .upsert(
        {
          token,
          ...(phone ? { phone } : {}),
          platform: String(body.platform ?? "").slice(0, 20),
          last_seen: new Date().toISOString(),
        },
        { onConflict: "token" }
      );

    return NextResponse.json({ ok: true });
  } catch {
    // Not being able to register is a quiet disappointment, not an error the
    // customer needs to see.
    return NextResponse.json({ ok: false });
  }
}
