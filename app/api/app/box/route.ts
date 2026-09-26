import { NextResponse } from "next/server";

import { boxById, cartOf, occasionBySlug } from "@/lib/boxes";
import { whenOptions } from "@/lib/box-view";
import { orderLinkId, placeOrder } from "@/lib/orders";
import { tokenFor } from "@/lib/customer-auth";
import { markCustomPending } from "@/lib/order-edit";
import { furthest, isUrgent, readRepeat, tripForBox } from "@/lib/box-day";
import { lagosToday } from "@/lib/time";
import { db } from "@/lib/supabase";
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
      /** "GBP" or "USD" on a card, where somebody abroad is paying. */
      payCurrency?: string;
      /** "", "weekly", "fortnightly" or "monthly". */
      repeat?: string;
      repeatNote?: string;
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

    const asked = String(body.when ?? "");

    // A day of their own, the same as the website. "day:2026-10-04" is a
    // date they picked and "anytime" is them saying any day suits. Two clear
    // days is the standard fee; sooner is the urgent one, decided here and
    // never read off the phone.
    if (asked === "anytime" || asked.startsWith("day:")) {
      const wanted = asked.startsWith("day:") ? asked.slice(4) : "";
      if (wanted !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(wanted)) {
        return NextResponse.json({ error: "Pick the day you would like it." }, { status: 400 });
      }
      if (wanted !== "" && (wanted < lagosToday() || wanted > furthest())) {
        return NextResponse.json(
          { error: "Pick a day between today and three weeks from now." },
          { status: 400 }
        );
      }

      const trip = await tripForBox(
        wanted,
        wanted === "" ? `${occasion.name} · day to agree` : `${occasion.name} · ${box.name}`
      );
      if (!trip) {
        return NextResponse.json(
          { error: "Could not start that one. Try again in a moment." },
          { status: 500 }
        );
      }

      return await finish(
        trip.id,
        "",
        wanted !== "" && isUrgent(wanted) ? box.car_fee : box.run_fee,
        wanted
      );
    }

    // Matched against the list the shop would offer right now. An app left
    // open all afternoon is still showing this morning's cars.
    const options = await whenOptions(occasion, box);
    const going = options.find((one) => one.key === asked);
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

    return await finish(going.runId, going.at, going.fee, going.date ?? "");

    /**
     * The order itself, once the way it travels is settled.
     *
     * Written once because there are two ways in now: a car the shop is
     * driving, and a day the customer picked. Everything after that point is
     * the same order.
     */
    async function finish(
      batchId: string,
      at: string,
      fee: number,
      wanted: string
    ): Promise<NextResponse> {
      const chosen: Record<string, number> = {};
      for (const [line, pick] of Object.entries(body.swaps ?? {})) {
        const spot = Number(pick);
        if (Number.isFinite(spot) && spot >= 0) chosen[line] = Math.round(spot);
      }

      const giftName = String(body.giftName ?? "").trim();
      const giftPhone = String(body.giftPhone ?? "").trim();

      const result = await placeOrder({
        source: "app",
        batchId,
        deliverAt: at || undefined,
        name: String(body.name ?? ""),
        phone: String(body.phone ?? ""),
        hostel: String(body.hostel ?? ""),
        lines: cartOf(box!, chosen),
        paymentMethod: body.paymentMethod === "card" ? "card" : "transfer",
        payCurrency:
          body.paymentMethod === "card" &&
          (body.payCurrency === "GBP" || body.payCurrency === "USD")
            ? body.payCurrency
            : undefined,
        customerNote: String(body.customerNote ?? "").trim().slice(0, 300),
        heardFrom: String(body.heardFrom ?? "").trim(),
        // Filling either one is the answer, and half of one is refused with a
        // sentence rather than quietly becoming an ordinary order.
        giftTo:
          giftName === "" && giftPhone === ""
            ? undefined
            : { name: giftName, phone: giftPhone },
        fixedFee: fee,
        boxId: box!.id,
      });

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

      // A change written down is a price not yet agreed, whichever door the
      // order came through. No tick to forget.
      if (String(body.customerNote ?? "").trim() !== "") {
        await markCustomPending(result.orderId).catch(() => {});
      }

      // The day they asked for, and whether they want it again. Neither
      // decides a price, so neither is worth failing an order over.
      const repeat = readRepeat(body.repeat);
      if (wanted !== "" || repeat !== "") {
        await db()
          .from("orders")
          .update({
            ...(wanted !== "" ? { wanted_on: wanted } : {}),
            ...(repeat !== ""
              ? {
                  repeat_every: repeat,
                  repeat_note: String(body.repeatNote ?? "").trim().slice(0, 120),
                }
              : {}),
          })
          .eq("id", result.orderId)
          .then(
            () => undefined,
            () => undefined
          );
      }

      const phone = normalisePhone(String(body.phone ?? ""));
      return NextResponse.json({
        orderId: await orderLinkId(result.orderId).catch(() => result.orderId),
        token: phone ? tokenFor(phone) : null,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not place that order." },
      { status: 500 }
    );
  }
}
