import { NextResponse } from "next/server";
import { carLabel } from "@/lib/view";
import { phoneFromToken } from "@/lib/customer-auth";
import { ordersForPhone } from "@/lib/orders";
import { shareRef } from "@/lib/money";
import { SLOT_LABEL } from "@/lib/config";
import { takesMoney } from "@/lib/batches";
import { runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Everything this number has ordered. The token is the proof. */
export async function GET(request: Request): Promise<NextResponse> {
  const phone = phoneFromToken(
    request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null
  );
  if (!phone) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  try {
    const orders = await ordersForPhone(phone);
    return NextResponse.json({
      orders: orders.map((order) => ({
        id: order.id,
        ref: shareRef(order, order.shares ?? []),
        status: order.status,
        stage: order.batch.stage,
        // So the list can say a run has gone rather than "not paid yet",
        // which reads as something they can still put right.
        payable: takesMoney(order.batch),
        total: order.total,
        items: order.lines.reduce((count, line) => count + line.qty, 0),
        run: carLabel(order.batch),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read your orders." },
      { status: 500 }
    );
  }
}
