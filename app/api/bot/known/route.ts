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
    if (!phone) return NextResponse.json({ known: false, name: "", hasBlock: false });

    const details = await customerDetails(phone);
    /*
     * A first name, and never the block.
     *
     * The name is given back because the shop knowing who you are is the
     * point: somebody who ordered last week should not be asked what to
     * call them. One word, not the whole name on the account.
     *
     * The block is not, and that is the line. A first name tells whoever
     * typed the number almost nothing they did not already know to type
     * it; a hostel tells them where that person sleeps, and the order box
     * is open to anybody with no sign-in at all. So it is used when the
     * order is placed and never sent to a browser.
     */
    const first = String(details?.name ?? "").trim().split(/\s+/)[0] ?? "";
    return NextResponse.json({
      known: details !== null,
      name: first,
      hasBlock: String(details?.hostel ?? "").trim() !== "",
    });
  } catch {
    // Not knowing is the safe answer: it costs one question, and the
    // question is one the chat has always asked.
    return NextResponse.json({ known: false, name: "", hasBlock: false });
  }
}
