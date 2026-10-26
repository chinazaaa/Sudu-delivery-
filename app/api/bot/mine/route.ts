import { NextResponse } from "next/server";

import {
  checkOrderNumber,
  checkPin,
  currentCustomer,
  signInCustomer,
} from "@/lib/customer-auth";
import { ordersForPhone } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { orderRef } from "@/lib/money";
import { STAGE_LABEL } from "@/lib/stages";

export const dynamic = "force-dynamic";

/**
 * Where my order is, answered in the chat.
 *
 * People ask the chat this more than they ask anything else, and until now
 * the answer was a direction: open this other page, sign in there, come
 * back. The question has an answer and the chat knows it.
 *
 * Two ways in, and no third.
 *
 * This device, when it has already proved whose it is. Placing an order
 * proves a number as well as a PIN does, so somebody who ordered on this
 * phone is simply told, with nothing asked. That covers most people,
 * because most people check on the phone they ordered on.
 *
 * Otherwise the number and the PIN, exactly as the orders page asks for
 * them. Nothing is sent to anybody to make this work: there is no way to
 * text a PIN, so a chat that offered to would be promising a person's
 * evening work as if it were automatic.
 *
 * What it will never do is answer on a number alone. The chat is a public
 * box on a public page: anybody can open it and type anybody's number. The
 * answer names a hostel and an hour, which is where a particular student
 * will be standing and when, and that is not a thing to hand out to
 * whoever asks. The same reason `known` answers yes or no and nothing
 * else, and the same reason a PIN only ever goes to the number it belongs
 * to.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      phone?: unknown;
      pin?: unknown;
      ref?: unknown;
    };

    const said = normalisePhone(String(body.phone ?? ""));
    const pin = String(body.pin ?? "").trim();
    // For somebody who never kept their PIN. Weaker, and locked by the same
    // counter, so guessing order numbers shuts the phone number for fifteen
    // minutes. See checkOrderNumber.
    const ref = String(body.ref ?? "").trim();

    // Already proved on this device. Nothing to ask.
    let phone = await currentCustomer();

    if (!phone) {
      if (!said) return NextResponse.json({ need: "phone", orders: [] });
      if (!pin && !ref) return NextResponse.json({ need: "pin", orders: [] });

      const result = pin
        ? await checkPin(said, pin)
        : await checkOrderNumber(said, ref);
      if (!result.ok) {
        return NextResponse.json({
          need: pin ? "pin" : "ref",
          error: result.error,
          orders: [],
        });
      }
      // Asked once, on this device, like every other way in.
      await signInCustomer(said).catch(() => {});
      phone = said;
    }

    const all = await ordersForPhone(phone);

    /*
     * What is still happening, newest first.
     *
     * Somebody asking where their order is means the one that has not
     * arrived. A list that opens with August is a list they have to read
     * before it answers them.
     */
    const live = all.filter(
      (order) =>
        order.status !== "delivered" &&
        order.status !== "cancelled" &&
        order.status !== "refunded"
    );

    const say = (live.length > 0 ? live : all.slice(0, 1)).slice(0, 3).map((order) => ({
      ref: orderRef(order),
      href: `/o/${order.short || order.id}`,
      total: order.total,
      paid: order.status !== "pending",
      status: order.status,
      /* Where the food has got to, in the same words the order page uses,
         so the two cannot drift apart. */
      stage: STAGE_LABEL[order.batch.stage] ?? "",
      when: order.batch.delivery_window_text ?? "",
      runDate: order.batch.run_date ?? "",
      hostel: order.hostel ?? "",
      /* Nothing has arrived yet, so this is the one worth talking about. */
      live: live.length > 0,
    }));

    return NextResponse.json({ need: "", orders: say });
  } catch {
    // A chat that cannot look something up says so in the room above this
    // one. Never a stack trace, and never a half answer.
    return NextResponse.json({ need: "", orders: [], error: "lookup failed" });
  }
}
