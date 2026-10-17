import { NextResponse } from "next/server";

import { previewCoupon } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * A discount code, checked against the order in the chat.
 *
 * The same door the website's checkout uses, so a code is worth exactly
 * what it is worth there: the one-offer rule holds, a code tied to one
 * kitchen or one run still only works on that kitchen or that run, and the
 * figure comes back from the till rather than from the conversation.
 *
 * Nothing is applied here. This says what a code would be worth, and the
 * code itself is handed to the checkout when the order is placed, where it
 * is checked again and counted as used. A chat that applied its own
 * discounts would be a chat worth lying to.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      code?: unknown;
      batchId?: unknown;
      /** A car of its own instead of a run, so the fee the code is read
       *  against comes off the same day ladder. */
      deliverAt?: unknown;
      phone?: unknown;
      lines?: unknown;
    };

    const code = String(body.code ?? "").trim();
    if (code === "") return NextResponse.json({ ok: false, error: "Enter a code." });

    const lines = Array.isArray(body.lines)
      ? (body.lines as { menu_item_id?: unknown; qty?: unknown; option_ids?: unknown }[])
          .map((line) => ({
            menu_item_id: String(line.menu_item_id ?? ""),
            qty: Math.max(1, Math.min(20, Math.round(Number(line.qty ?? 1)) || 1)),
            option_ids: Array.isArray(line.option_ids)
              ? line.option_ids.map(String).slice(0, 12)
              : [],
            for_name: null,
          }))
          .filter((line) => line.menu_item_id !== "")
      : [];
    if (lines.length === 0) {
      return NextResponse.json({ ok: false, error: "Nothing in the order yet." });
    }

    const got = await previewCoupon({
      code,
      batchId: String(body.batchId ?? ""),
      deliverAt: String(body.deliverAt ?? "").trim(),
      lines,
      phone: String(body.phone ?? ""),
    });

    return NextResponse.json(
      got.ok
        ? { ok: true, discount: got.discount, label: got.label, code: code.toUpperCase() }
        : { ok: false, error: got.error }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Could not check that just now." });
  }
}
