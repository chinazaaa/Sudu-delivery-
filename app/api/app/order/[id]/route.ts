import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";
import { narration } from "@/lib/messages";
import { payableAccounts } from "@/lib/banks";
import { safeSettings } from "@/lib/settings";
import { shareRef } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/** One order, as the app shows it: what was ordered, what is owed, where to
 *  pay it, and how far the run has got. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "No such order." }, { status: 404 });

    const settings = await safeSettings();

    return NextResponse.json({
      id: order.id,
      ref: shareRef(order, order.shares),
      status: order.status,
      stage: order.batch.stage,
      total: order.total,
      food: order.subtotal_food,
      fee: order.fee,
      discount: order.discount,
      paymentMethod: order.payment_method,
      paymentLink: order.payment_link,
      narration: narration(order, order.shares),
      hostel: order.hostel,
      run: {
        label: `${runDateLabel(order.batch.run_date)} · ${SLOT_LABEL[order.batch.slot]}`,
        cutOffISO: order.batch.cut_off_at,
        window: order.batch.delivery_window_text,
      },
      lines: order.lines.map((line) => ({
        name: line.name,
        restaurant: line.restaurant,
        qty: line.qty,
        choices: line.choices,
        unitPrice: line.unit_price_at_order,
      })),
      // Where to send the money, best account first.
      accounts: (await payableAccounts(settings)).map((account) => ({
        bank: account.bank_name,
        name: account.account_name,
        number: account.account_number,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read that order." },
      { status: 500 }
    );
  }
}
