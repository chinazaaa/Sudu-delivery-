import { NextResponse } from "next/server";

import { quote } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * The bill, from the till.
 *
 * The chat does no arithmetic. Every figure it shows comes back from here,
 * which is the same function the checkout charges by: the same priced
 * lines, the same container count, the same ladder with its steps, the
 * same floors, the same extra for a far kitchen, the same pricing for a
 * car of its own.
 *
 * That is the only way a chat cannot be cheated and the only way it cannot
 * quietly disagree with what you take at the door. Order five things where
 * the ladder steps at four and it steps, because nothing here knows how to
 * do anything else.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      lines?: unknown;
      batchId?: unknown;
      sameDay?: unknown;
    };

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
      return NextResponse.json({ error: "Nothing in the order yet." }, { status: 200 });
    }

    const got = await quote({
      lines,
      batchId: body.batchId ? String(body.batchId) : undefined,
      sameDay: body.sameDay ? { urgent: Boolean((body.sameDay as { urgent?: unknown }).urgent) } : null,
    });

    if ("error" in got) return NextResponse.json({ error: got.error }, { status: 200 });
    return NextResponse.json(got.quote);
  } catch {
    return NextResponse.json({ error: "Could not work that out just now." }, { status: 200 });
  }
}
