import { db } from "./supabase";
import { feeFor, splitFee } from "./fees";
import type { Batch, Order, OrderGroup } from "./types";

/**
 * At the cut-off a split group travels on money, not promises: unpaid shares
 * are simply left behind (they were never marked paid, so they do not travel).
 * If losing them drops the group into a cheaper band, the fee is recalculated
 * in the customer's favour and the difference recorded as a refund owed,
 * never a top-up demand (addendum §2).
 *
 * Idempotent: running it again on a settled group changes nothing.
 */
export async function settleGroupFees(batch: Batch): Promise<void> {
  const { data: groups } = await db()
    .from("order_groups")
    .select("*")
    .eq("batch_id", batch.id)
    .eq("mode", "split");

  for (const group of (groups ?? []) as OrderGroup[]) {
    await settleGroup(group, batch);
  }
}

async function settleGroup(group: OrderGroup, batch: Batch): Promise<void> {
  const { data } = await db().from("orders").select("*").eq("group_id", group.id);
  const orders = (data ?? []) as Order[];

  const travelling = orders.filter((o) => o.status === "paid" || o.status === "delivered");
  if (travelling.length === 0) return;

  const { data: items } = await db()
    .from("order_items")
    .select("order_id, qty")
    .in("order_id", travelling.map((o) => o.id));

  const countFor = (orderId: string) =>
    (items ?? [])
      .filter((row) => row.order_id === orderId)
      .reduce((sum, row) => sum + (row.qty as number), 0);

  const counts = travelling.map((o) => countFor(o.id));
  const settledFee = feeFor(
    counts.reduce((sum, count) => sum + count, 0),
    batch.flash_fee
  );
  const shares = splitFee(settledFee, counts);

  for (const [index, order] of travelling.entries()) {
    const share = shares[index];
    if (share >= order.fee) continue; // Only ever downward.

    await db()
      .from("orders")
      .update({
        fee: share,
        total: Math.max(0, order.subtotal_food + share - order.discount),
        refund_owed: order.refund_owed + (order.fee - share),
      })
      .eq("id", order.id);
  }
}

/** Refunds created by a group shrinking, so the admin can pay them out. */
export async function refundsOwed(batchId: string): Promise<Order[]> {
  const { data } = await db()
    .from("orders")
    .select("*")
    .eq("batch_id", batchId)
    .gt("refund_owed", 0);
  return (data ?? []) as Order[];
}
