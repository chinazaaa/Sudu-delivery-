import { NextResponse } from "next/server";

import { boxById, cartOf, occasionBySlug } from "@/lib/boxes";
import { whenOptions } from "@/lib/box-view";
import { orderLinkId, placeOrder } from "@/lib/orders";
import { tokenFor } from "@/lib/customer-auth";
import { markCustomPending } from "@/lib/order-edit";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * Ordering a box from the app.
 *
 * Everything that decides money is looked up here, never read off the
 * request: which box, what is in it, what the swap really is, which car is
 * going and what delivery costs on it. A phone can say a box costs four
 * thousand to deliver; only the shop can say it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      occasion?: string;
      box?: string;
      when?: string;
      /** Line id to the index of the swap they picked. */
      swaps?: Record<string, number>;
      name?: string;
      phone?: string;
      hostel?: string;
      paymentMethod?: string;
      customerNote?: string;
      heardFrom?: string;
      giftName?: string;
      giftPhone?: string;
    };

    const occasion = await occasionBySlug(String(body.occasion ?? ""));
    const box = await boxById(String(body.box ?? ""));
    if (!occasion || !occasion.active || !box || !box.active) {
      return NextResponse.json({ error: "That box is not on any more." }, { status: 400 });
    }

    // Matched against the list the shop would offer right now. An app left
    // open all afternoon is still showing this morning's cars.
    const options = await whenOptions(occasion, box);
    const going = options.find((one) => one.key === String(body.when ?? ""));
    if (!going) {
      return NextResponse.json(
        {
          error:
            options.length === 0
              ? "Nothing can get there in time now."
              : "That time has gone. Pick another one.",
        },
        { status: 400 }
      );
    }

    const chosen: Record<string, number> = {};
    for (const [line, pick] of Object.entries(body.swaps ?? {})) {
      const at = Number(pick);
      if (Number.isFinite(at) && at >= 0) chosen[line] = Math.round(at);
    }

    const giftName = String(body.giftName ?? "").trim();
    const giftPhone = String(body.giftPhone ?? "").trim();

    const result = await placeOrder({
      source: "app",
      batchId: going.runId,
      deliverAt: going.at || undefined,
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      hostel: String(body.hostel ?? ""),
      lines: cartOf(box, chosen),
      paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
      customerNote: String(body.customerNote ?? "").trim().slice(0, 300),
      heardFrom: String(body.heardFrom ?? "").trim(),
      // Filling either one is the answer, and half of one is refused with a
      // sentence rather than quietly becoming an ordinary order.
      giftTo:
        giftName === "" && giftPhone === "" ? undefined : { name: giftName, phone: giftPhone },
      fixedFee: going.fee,
      boxId: box.id,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // The same rule the website follows: a change written down is a price
    // not yet agreed, whichever door the order came through.
    if (String(body.customerNote ?? "").trim() !== "") {
      await markCustomPending(result.orderId).catch(() => {});
    }

    const phone = normalisePhone(String(body.phone ?? ""));
    return NextResponse.json({
      orderId: await orderLinkId(result.orderId).catch(() => result.orderId),
      token: phone ? tokenFor(phone) : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not place that order." },
      { status: 500 }
    );
  }
}
