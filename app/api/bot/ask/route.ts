import { NextResponse } from "next/server";

import { ASKED_IN_CHAT, ASKED_IN_CHAT_QUESTION, askFor } from "@/lib/requests";

export const dynamic = "force-dynamic";

/**
 * Something the shop does not stock, asked for in the chat.
 *
 * Somebody who types Debonairs is not a dead end, they are a sale the shop
 * has not made yet. The site already has a page for this and a list in
 * admin that counts what nobody answered; this is the same door, opened
 * from inside the conversation so nobody has to start again on another
 * page with their name and number.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      wanted?: unknown;
      name?: unknown;
      phone?: unknown;
      hostel?: unknown;
      /** "question" where somebody had something to ask rather than
       *  something to buy. It lands in the same list, which is the one
       *  somebody actually reads, marked so the answer is written as a
       *  sentence rather than as a price. */
      kind?: unknown;
    };

    const asked = await askFor({
      wanted: String(body.wanted ?? ""),
      budget: "",
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      hostel: String(body.hostel ?? ""),
      note: String(body.kind ?? "") === "question" ? ASKED_IN_CHAT_QUESTION : ASKED_IN_CHAT,
    });

    return NextResponse.json(
      asked.ok ? { ok: true } : { ok: false, error: asked.error }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Could not send that just now." });
  }
}
