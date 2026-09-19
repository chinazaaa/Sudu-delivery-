import { NextResponse } from "next/server";
import { liveOffers } from "@/lib/coupons";
import { nearMiss, pickOffer, type CartItem } from "@/lib/offers";
import { isReturningCustomer } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * What a promotion does to this cart, worked out where the rules live.
 *
 * The app was pricing delivery off the bands alone, so on food an offer was
 * about to price it showed a figure nobody would be charged, and it could not
 * say "one more thing from here and delivery is free" at all. Both answers
 * come from the same functions the website and the order itself use, so there
 * is one rule rather than a copy of it in an app that ships on its own clock.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      batchId?: string;
      deliverAt?: string | null;
      phone?: string;
      lines?: CartItem[];
    };

    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) return NextResponse.json({ offer: null, nearly: null });

    const phone = normalisePhone(String(body.phone ?? ""));
    const returning = phone ? await isReturningCustomer(phone) : false;
    const context = {
      restaurantIds: [...new Set(lines.map((line) => line.restaurantId))],
      itemIds: lines.map((line) => line.itemId),
      lineChoices: lines.map((line) => line.choices),
      items: lines.length,
      batchId: String(body.batchId ?? ""),
      deliverAt: body.deliverAt ?? null,
      returning,
    };

    const offers = await liveOffers();
    const found = pickOffer(offers, context);
    const nearly = found
      ? null
      : nearMiss(offers, lines, {
          batchId: context.batchId,
          deliverAt: context.deliverAt,
          returning,
        });

    return NextResponse.json({
      // What delivery costs under the offer that applies, and what to call it.
      offer: found ? { fee: found.fee, note: found.offer.note.trim() } : null,
      // The one it nearly has, and what is standing in the way.
      nearly: nearly
        ? {
            fee: nearly.fee,
            note: nearly.offer.note.trim(),
            blocking: nearly.blocking,
          }
        : null,
    });
  } catch {
    // Never a reason to stop somebody ordering: the app falls back to the
    // ladder, and the order itself prices the offer either way.
    return NextResponse.json({ offer: null, nearly: null });
  }
}
