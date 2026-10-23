import { NextResponse } from "next/server";

import { customerDetails } from "@/lib/customer-auth";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Whether this number has ordered before, and nothing else about it.
 *
 * Built to save a question: somebody who has ordered before has a block on
 * file, and asking them again is the shop admitting it keeps no records.
 *
 * What it will not do is say whose number it is or where they live. The
 * number is typed into a public chat by whoever is holding the phone, and
 * answering "that is BEST, in Trezadel" would turn the order box into a
 * lookup for finding out where somebody sleeps. One number at a time, by
 * anybody, with no sign-in. So the answer is yes or no, and the block
 * itself is only ever used, never shown: the person it belongs to already
 * knows where they live, and nobody else learns it.
 *
 * The same reason the shop's PIN only ever goes to the number it belongs
 * to.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { phone?: unknown };
    const phone = normalisePhone(String(body.phone ?? ""));
    if (!phone) return NextResponse.json({ known: false, hasBlock: false });

    const details = await customerDetails(phone);
    return NextResponse.json({
      known: details !== null,
      hasBlock: String(details?.hostel ?? "").trim() !== "",
    });
  } catch {
    // Not knowing is the safe answer: it costs one question, and the
    // question is one the chat has always asked.
    return NextResponse.json({ known: false, hasBlock: false });
  }
}
