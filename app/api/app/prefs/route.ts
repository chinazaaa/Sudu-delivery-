import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Whether this phone wants to hear about deals.
 *
 * Keyed on the push token, which is this install of the app, rather than on a
 * number: somebody who has never ordered still has a switch, and turning it
 * off on one phone does not silence another.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { token?: string; deals?: boolean };
    const token = String(body.token ?? "").slice(0, 200);
    if (!token.startsWith("ExponentPushToken")) {
      return NextResponse.json({ error: "That is not a push token." }, { status: 400 });
    }

    await db()
      .from("push_devices")
      .update({ deals: body.deals === true })
      .eq("token", token);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

/** What this phone has it set to, so the switch opens showing the truth. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (!token.startsWith("ExponentPushToken")) return NextResponse.json({ deals: true });

    const { data } = await db()
      .from("push_devices")
      .select("deals")
      .eq("token", token)
      .maybeSingle();

    return NextResponse.json({ deals: (data as { deals?: boolean } | null)?.deals !== false });
  } catch {
    return NextResponse.json({ deals: true });
  }
}
