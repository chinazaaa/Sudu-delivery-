import { db } from "./supabase";
import { evenShare, feeFor, splitFee } from "./fees";
import { activeBands } from "./settings";
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
  const carried = counts.reduce((sum, count) => sum + count, 0);
  const bands = await activeBands();

  // A shared delivery splits evenly and has to keep splitting evenly when
  // somebody drops out for not paying. Settling it by the proportional rule
  // would quietly turn the deal everybody agreed to into a different one,
  // after they had paid.
  const shares = group.closes_at
    ? travelling.map(() => evenShare(carried, travelling.length, batch.flash_fee, bands))
    : splitFee(feeFor(carried, batch.flash_fee, bands), counts);

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
/** How long a shared delivery stays open for friends to pile into. */
export const SHARE_MINUTES = 15;

export type SharedGroup = {
  id: string;
  /** The token from the link this party was started with, when it was. */
  party_token: string | null;
  batch_id: string;
  leader_phone: string;
  leader_name: string;
  mode: "one_payer" | "split";
  payer_phone: string | null;
  closes_at: string | null;
  closed_at: string | null;
};

export async function getSharedGroup(id: string): Promise<SharedGroup | null> {
  const { data, error } = await db()
    .from("order_groups")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return (data as SharedGroup) ?? null;
}

/** Everybody's order in one shared delivery, newest last. */
export async function groupOrders(groupId: string): Promise<Order[]> {
  const { data } = await db()
    .from("orders")
    .select("*")
    .eq("group_id", groupId)
    .neq("status", "refunded")
    .order("created_at");
  return (data ?? []) as Order[];
}

export type CloseResult =
  | { ok: true; share: number; people: number; items: number; alreadyClosed: boolean }
  | { ok: false; error: string };

/**
 * Work out what everybody owes, and freeze it.
 *
 * Until this runs nobody in the group has a delivery fee, because it depends
 * on how many end up in the car and how much they order between them. Closing
 * bands the fee on the whole load, splits it evenly, and writes it onto every
 * order at once.
 *
 * Safe to call twice, and it will be: the leader can close by hand at the same
 * moment the clock runs out. A group that is already closed is left exactly as
 * it was, because the second call must not re-price orders somebody has by
 * then been told to pay.
 */
export async function closeGroup(groupId: string): Promise<CloseResult> {
  const group = await getSharedGroup(groupId);
  if (!group) return { ok: false, error: "That group could not be found." };

  const orders = await groupOrders(groupId);
  if (orders.length === 0) return { ok: false, error: "Nobody has ordered in that group." };

  if (group.closed_at) {
    return {
      ok: true,
      alreadyClosed: true,
      share: orders[0].fee,
      people: orders.length,
      items: 0,
    };
  }

  const { data: items } = await db()
    .from("order_items")
    .select("order_id, qty")
    .in("order_id", orders.map((one) => one.id));

  const carried = (items ?? []).reduce((sum, row) => sum + (row.qty as number), 0);

  const { data: batch } = await db()
    .from("batches")
    .select("flash_fee")
    .eq("id", group.batch_id)
    .maybeSingle();

  const share = evenShare(
    carried,
    orders.length,
    (batch?.flash_fee as number | null) ?? null,
    await activeBands()
  );

  // Claim the close first. Two callers arriving together, the leader and the
  // clock, must not both go on to write fees.
  const { data: claimed } = await db()
    .from("order_groups")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", groupId)
    .is("closed_at", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    return { ok: true, alreadyClosed: true, share: orders[0].fee, people: orders.length, items: carried };
  }

  for (const order of orders) {
    await db()
      .from("orders")
      .update({
        fee: share,
        total: Math.max(0, order.subtotal_food + share - order.discount),
      })
      .eq("id", order.id)
      // Never re-price something somebody has already paid for.
      .eq("status", "pending");
  }

  return { ok: true, alreadyClosed: false, share, people: orders.length, items: carried };
}

/** Closes every shared delivery whose time is up. Run from a schedule. */
export async function closeDueGroups(): Promise<number> {
  const { data, error } = await db()
    .from("order_groups")
    .select("id")
    .is("closed_at", null)
    .not("closes_at", "is", null)
    .lte("closes_at", new Date().toISOString());

  if (error) return 0;

  let closed = 0;
  for (const row of data ?? []) {
    const result = await closeGroup(row.id as string);
    if (result.ok && !result.alreadyClosed) closed += 1;
  }
  return closed;
}

/**
 * One person has finished adding. When that is the last of them, the group
 * closes there and then rather than making everybody wait out the clock.
 */
export async function markDone(orderId: string): Promise<CloseResult | null> {
  const { data: order } = await db()
    .from("orders")
    .select("id, group_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.group_id) return null;

  await db().from("orders").update({ done_at: new Date().toISOString() }).eq("id", orderId);

  const orders = await groupOrders(order.group_id as string);
  const everybody = orders.length > 0 && orders.every((one) => one.done_at !== null);
  return everybody ? closeGroup(order.group_id as string) : null;
}

/**
 * Start a shared delivery.
 *
 * Open for fifteen minutes, and never past the run's own cut off, because a
 * group that outlived its run would collect people for a car that had already
 * gone. Nobody in it has a delivery fee until it closes.
 */
export async function startSharedGroup(args: {
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
}): Promise<string | null> {
  const cutOff = new Date(args.batch.cut_off_at).getTime();
  const wanted = Date.now() + SHARE_MINUTES * 60_000;

  const { data } = await db()
    .from("order_groups")
    .insert({
      batch_id: args.batch.id,
      leader_phone: args.phone,
      leader_name: args.name,
      hostel: args.hostel,
      mode: "split",
      collect_mode: "each",
      closes_at: new Date(Math.min(wanted, cutOff)).toISOString(),
    })
    .select("id")
    .single();

  return (data?.id as string) ?? null;
}

/** The shared group an order belongs to, if it is in one that is still open. */
export async function openGroupFor(orderId: string): Promise<SharedGroup | null> {
  const { data: order } = await db()
    .from("orders")
    .select("group_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order?.group_id) return null;

  const group = await getSharedGroup(order.group_id as string);
  if (!group || !group.closes_at || group.closed_at) return null;
  return group;
}

/**
 * The group behind a link, making it if this is the first order in it.
 *
 * The link is made in the browser before anybody has ordered, so the group it
 * refers to may not exist yet. Whoever checks out first brings it into being;
 * everybody after them finds it. The unique index on the token is what makes
 * that safe when two friends check out in the same second: one insert wins,
 * the other comes back and reads what the winner made.
 */
export async function groupForParty(args: {
  token: string;
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
}): Promise<SharedGroup | null> {
  const existing = await db()
    .from("order_groups")
    .select("*")
    .eq("party_token", args.token)
    .maybeSingle();

  if (existing.data) {
    const group = existing.data as SharedGroup;
    // A party that has already been closed and priced cannot take anybody
    // else: the people in it have been told what they owe.
    return group.closed_at ? null : group;
  }

  const cutOff = new Date(args.batch.cut_off_at).getTime();
  const wanted = Date.now() + SHARE_MINUTES * 60_000;

  const { data, error } = await db()
    .from("order_groups")
    .insert({
      batch_id: args.batch.id,
      leader_phone: args.phone,
      leader_name: args.name,
      hostel: args.hostel,
      mode: "split",
      collect_mode: "each",
      party_token: args.token,
      closes_at: new Date(Math.min(wanted, cutOff)).toISOString(),
    })
    .select("*")
    .single();

  if (!error && data) return data as SharedGroup;

  // Somebody beat us to it by a fraction of a second. Theirs is the group.
  const raced = await db()
    .from("order_groups")
    .select("*")
    .eq("party_token", args.token)
    .maybeSingle();

  const group = (raced.data as SharedGroup) ?? null;
  return group && !group.closed_at ? group : null;
}
