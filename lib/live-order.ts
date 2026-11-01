import { db } from "./supabase";
import { STAGE_LABEL, PARCEL_LABEL, type BatchStage } from "./stages";

/**
 * The order somebody has in flight, for the front page.
 *
 * Placing an order and then coming back to the shop showed the shop:
 * eleven menus and a row of kitchens, with nothing anywhere about the
 * food already on its way. The one thing that person opened the site to
 * find out was the one thing it did not say, so they messaged a person to
 * ask, which is the question the order page exists to answer.
 *
 * Deliberately thin. This runs on the front page, which everybody loads
 * and most of them have nothing in flight, so it is one small query that
 * stops at the first answer rather than the fifty row history the orders
 * page reads. Nothing here can take the shop down: anything that fails
 * reads as no live order, and the front page is exactly as it was.
 */
export type LiveOrder = {
  id: string;
  /** What every link the shop sends says, for the words on the strip. */
  ref: string;
  /** Where it has got to, in the customer's words. */
  said: string;
  /** Whether the money is the thing standing in the way. */
  unpaid: boolean;
};

/** Statuses where there is nothing left to follow. */
const DONE = ["delivered", "cancelled", "refunded"];

export async function liveOrderFor(phone: string): Promise<LiveOrder | null> {
  if (!phone) return null;

  try {
    const { data } = await db()
      .from("orders")
      .select("id, short, order_no, status, batch_id")
      .or(`customer_phone.eq.${phone},deliver_to_phone.eq.${phone}`)
      .not("status", "in", `(${DONE.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(1);

    const order = ((data ?? []) as {
      id: string;
      short: string | null;
      order_no: number | null;
      status: string;
      batch_id: string | null;
    }[])[0];
    if (!order) return null;

    const ref = order.order_no
      ? `#${order.order_no}`
      : (order.short ?? order.id.slice(0, 7));

    // Not paid for is the whole story: where the car has got to is no use
    // to somebody whose food is not on it yet, and saying "getting ready
    // to go" about an order that will come off the run in ten minutes is
    // the shop telling somebody the wrong thing at the worst moment.
    if (order.status === "pending") {
      return { id: order.id, ref, said: "Waiting for payment", unpaid: true };
    }

    let said = "On its way";
    if (order.batch_id) {
      const { data: run } = await db()
        .from("batches")
        .select("stage, kind")
        .eq("id", order.batch_id)
        .maybeSingle();
      const row = run as { stage?: BatchStage; kind?: string } | null;
      if (row?.stage) {
        const words = row.kind === "parcel" ? PARCEL_LABEL : STAGE_LABEL;
        said = words[row.stage] ?? said;
      }
    }

    return { id: order.id, ref, said, unpaid: false };
  } catch {
    // No strip rather than a wrong one, and never a front page that fails
    // over something that is only an aside on it.
    return null;
  }
}
