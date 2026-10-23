import { NextResponse } from "next/server";

import { isSignedIn } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Who the shop is taking an order for, as somebody types.
 *
 * A few rows, by name or by number, so the button on the orders page can
 * open a box and find her rather than making somebody remember eleven
 * digits.
 *
 * Deliberately not the customer book's own reader, which carries the PIN
 * on every row. A PIN only ever goes to the number it belongs to, and the
 * one thing this must never do is put four hundred of them into a search
 * box in a browser.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const asked = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (asked.length < 2) return NextResponse.json({ found: [] });

  const safe = asked.replace(/[%,]/g, " ");
  try {
    const { data, error } = await db()
      .from("customers")
      .select("phone, name, hostel")
      .or(`name.ilike.%${safe}%,phone.ilike.%${safe}%,hostel.ilike.%${safe}%`)
      .order("name", { ascending: true })
      .limit(8);
    if (error) return NextResponse.json({ found: [] });

    return NextResponse.json({
      found: ((data ?? []) as { phone: string; name?: string; hostel?: string }[]).map(
        (one) => ({
          phone: one.phone,
          name: String(one.name ?? "").trim(),
          hostel: String(one.hostel ?? "").trim(),
        })
      ),
    });
  } catch {
    return NextResponse.json({ found: [] });
  }
}
