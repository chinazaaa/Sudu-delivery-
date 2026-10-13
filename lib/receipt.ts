import { db } from "./supabase";
import { getOrder, isPaid, type OrderLine } from "./orders";
import { SLOT_LABEL } from "./config";
import { runDateLabel } from "./time";

/**
 * An order as a receipt.
 *
 * Read from the order itself every time rather than written out and stored
 * when it was paid. A receipt kept as a copy is a receipt that disagrees
 * with the order the first time anything is swapped, and a swap is the one
 * thing boxes are for: the lines below are what was actually bought,
 * because order_items is written from the cart at checkout and carries the
 * swap rather than the box's own packing list.
 *
 * Only ever a paid one. A receipt for money nobody has sent is not a
 * receipt, it is a demand with the wrong word at the top.
 */

export type ReceiptLine = {
  name: string;
  restaurant: string;
  /** "Large", "Pepperoni": what they chose on the item. */
  choices: string[];
  /** Whose it is, in a shared delivery. */
  forName: string;
  qty: number;
  each: number;
  total: number;
};

export type Receipt = {
  /** "#1042", or the short code where an order has no number yet. */
  ref: string;
  paidOn: string;
  /** Who it is addressed to. */
  name: string;
  phone: string;
  /** Who it is going to, where that is somebody else. */
  forName: string;
  forPhone: string;
  block: string;
  /** The run, said as a day and a window. */
  day: string;
  window: string;
  /** The box this order is, where it is one, so the heading can say so. */
  box: string;
  lines: ReceiptLine[];
  food: number;
  fee: number;
  discount: number;
  coupon: string;
  total: number;
  paidBy: string;
  reference: string;
  note: string;
};

const money = (said: unknown): number => Number(said ?? 0);

export async function receiptFor(id: string): Promise<Receipt | null> {
  const order = await getOrder(id);
  if (!order) return null;
  // Paid or delivered. Anything else has no receipt to give.
  if (!isPaid(order.status)) return null;

  // The box's name, for the heading over its contents. The contents
  // themselves are the order's own lines, which is the point: swap the
  // pizza and the receipt says the pizza they are getting.
  let box = "";
  if (order.box_id) {
    const { data } = await db()
      .from("boxes")
      .select("name")
      .eq("id", order.box_id)
      .maybeSingle();
    box = String((data as { name?: string } | null)?.name ?? "");
  }

  return {
    ref: order.order_no ? `#${order.order_no}` : (order.short ?? order.id.slice(0, 7)),
    paidOn: order.paid_at ?? order.created_at,
    name: order.customer_name,
    phone: order.customer_phone,
    forName: order.deliver_to_name ?? "",
    forPhone: order.deliver_to_phone ?? "",
    block: order.hostel,
    day: runDateLabel(order.batch.run_date),
    window: order.batch.delivery_window_text || SLOT_LABEL[order.batch.slot],
    box,
    lines: order.lines.map((line: OrderLine) => ({
      name: line.name,
      restaurant: line.restaurant,
      choices: line.choices ?? [],
      forName: line.for_name ?? "",
      qty: line.qty,
      each: money(line.unit_price_at_order),
      total: money(line.unit_price_at_order) * line.qty,
    })),
    food: money(order.subtotal_food),
    fee: money(order.fee),
    discount: money(order.discount),
    coupon: order.coupon_code ?? "",
    total: money(order.total),
    paidBy: order.payment_method === "card" ? "Card" : "Bank transfer",
    reference: order.payment_ref ?? "",
    note: order.customer_note ?? "",
  };
}
