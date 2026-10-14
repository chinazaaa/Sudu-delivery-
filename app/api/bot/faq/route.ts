import { NextResponse } from "next/server";

import { faqAnswered } from "@/lib/faq";

export const dynamic = "force-dynamic";

/**
 * An answer counted as given.
 *
 * So the list in admin can be ordered by what people actually ask rather
 * than by what somebody imagined they would, and so an entry nobody has
 * ever reached is visibly worth rewording. Nothing depends on it: the
 * answer has already been said by the time this is called.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { id?: unknown };
    await faqAnswered(String(body.id ?? ""));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
