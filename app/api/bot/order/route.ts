import { NextResponse } from "next/server";

import { getOrder, placeOrder } from "@/lib/orders";
import { narration } from "@/lib/messages";
import { payableAccounts } from "@/lib/banks";
import { safeSettings } from "@/lib/settings";
import { normalisePhone } from "@/lib/phone";
import { customerDetails } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Placing the order the chat has been building.
 *
 * Through the same front door as the website's own checkout, on purpose.
 * An order placed any other way is an order the rest of the shop has
 * never heard of: no run sheet, no counter list, no PIN, no receipt. So
 * this is a thin wrapper and nothing more, and every rule about what may
 * ride which car, what it costs and who it belongs to is enforced where
 * it already was.
 *
 * What comes back is what the next message in the chat needs: the number
 * to quote, the account to pay into, and the narration to type on the
 * transfer, which is the one thing that turns a payment alert into an
 * order somebody can find.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      batchId?: unknown;
      name?: unknown;
      phone?: unknown;
      hostel?: unknown;
      lines?: unknown;
      /** A discount code, as typed. Checked here, by the checkout, rather
       *  than taken on the chat's word for it. */
      code?: unknown;
      /** Who it is for and what goes on the card, in the buyer's words, so
       *  the run sheet carries it to the person packing the box. */
      note?: unknown;
      /** A car of its own instead of a run: the instant it is to land. The
       *  checkout makes the car itself, so there is no batch to name. */
      deliverAt?: unknown;
    };

    const phone = normalisePhone(String(body.phone ?? ""));
    const name = String(body.name ?? "").trim();
    let hostel = String(body.hostel ?? "").trim();

    /*
     * The block the shop already has, filled in here rather than in the
     * chat.
     *
     * Somebody who has ordered before is offered their saved block
     * instead of being asked for it again, and says yes without the chat
     * ever printing it. That is deliberate: a number typed into a public
     * order box must not come back with a name and a hostel, or the box
     * becomes a way of finding out where somebody sleeps.
     *
     * So the chat sends nothing and this reads the record. It is the same
     * trust the order already runs on, since the number is what the whole
     * order is filed under.
     */
    if (hostel === "" && phone) {
      const saved = await customerDetails(phone);
      hostel = String(saved?.hostel ?? "").trim();
    }
    const batchId = String(body.batchId ?? "");
    const deliverAt = String(body.deliverAt ?? "").trim();

    if (!phone) {
      return NextResponse.json({ error: "That number does not look right." });
    }
    /*
     * A run or a car, and one of the two.
     *
     * Insisting on a batch turned away every order going on a car of its
     * own, which is the one kind the chat makes itself rather than picking
     * off a list: there is no batch to name because the checkout makes the
     * car when it takes the order.
     */
    if (name === "" || hostel === "" || (batchId === "" && deliverAt === "")) {
      return NextResponse.json({ error: "Something is missing from this order." });
    }

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
    if (lines.length === 0) return NextResponse.json({ error: "Nothing in the order yet." });

    const placed = await placeOrder({
      batchId,
      name,
      phone,
      hostel,
      lines,
      // Its own door, beside the website and the app, so the books can
      // say whether the chat is earning its keep.
      source: "bot",
      ...(deliverAt === "" ? {} : { deliverAt }),
      coupon: String(body.code ?? "").trim(),
      customerNote: String(body.note ?? "").trim().slice(0, 500),
      paymentMethod: "transfer",
      cameFrom: "chat",
    });

    if (!placed.ok) return NextResponse.json({ error: placed.error });

    const order = await getOrder(placed.orderId);
    if (!order) return NextResponse.json({ error: "The order was placed but cannot be read back." });

    const settings = await safeSettings();
    const accounts = await payableAccounts(settings);
    const account = accounts[0] ?? null;

    return NextResponse.json({
      id: order.id,
      ref: order.order_no ? `#${order.order_no}` : (order.short ?? order.id.slice(0, 7)),
      // The page that follows this one order from paid to handed over.
      // The short code where there is one, because that is what every link
      // the shop sends says.
      link: `/o/${order.short || order.id}`,
      // What to type on the transfer. Without it a payment alert is an
      // amount and a stranger's name, and somebody has to guess.
      narration: narration(order),
      total: order.total,
      account: account
        ? {
            bank: account.bank_name,
            name: account.account_name,
            number: account.account_number,
          }
        : null,
      // Whether the shop is marking transfers paid by itself today, so the
      // chat promises watching or promises a message, and never both.
      watching: String(settings.auto_paid ?? "") === "on",
    });
  } catch {
    return NextResponse.json({ error: "Could not place that just now." });
  }
}
