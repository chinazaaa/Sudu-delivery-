import { db } from "./supabase";
import { evenShare, feeFor, isUrgent, sameDayFee, splitFee } from "./fees";
import { activeBands, sameDayPricing } from "./settings";
import { countCartItems, groupCarts, isReady, markCartDone } from "./group-carts";
import { announceGroup } from "./announce-group";
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

/**
 * One car at a time somebody chose, split between the people in it.
 *
 * Rounded up to the nearest hundred for the same reason the run split is: a
 * share of 2,166 is a number nobody wants to type into a banking app, and
 * rounding down would leave the shop short of what the trip costs.
 */
async function evenSameDayShare(
  items: number,
  people: number,
  deliverAt: string | null
): Promise<number> {
  const { bands, urgentExtra } = await sameDayPricing();
  const urgent = deliverAt ? isUrgent(new Date(deliverAt)) : false;
  const whole = sameDayFee(items, urgent, bands, urgentExtra);
  return people < 1 ? whole : Math.ceil(whole / people / 100) * 100;
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
/**
 * Start the quarter of an hour, on the first food to land in a group.
 *
 * Until somebody has put food in there is nothing for anybody to join, so the
 * clock has nothing to measure. It begins with the first cart and never runs
 * past the car's own last call, which is what closes_at already holds. Only
 * ever brings the time forward, so the second person cannot push the door
 * open again.
 */
export async function startGroupClock(groupId: string): Promise<void> {
  const group = await getSharedGroup(groupId);
  if (!group || group.closed_at) return;

  const waiting = (await groupCarts(groupId)).filter((cart) => cart.lines.length > 0);
  if (waiting.length !== 1) return; // Not the first. The clock is already going.

  const wanted = Date.now() + SHARE_MINUTES * 60_000;
  const current = group.closes_at ? new Date(group.closes_at).getTime() : wanted;
  if (wanted >= current) return; // The car leaves before the quarter of an hour.

  await db()
    .from("order_groups")
    .update({ closes_at: new Date(wanted).toISOString() })
    .eq("id", groupId)
    .is("closed_at", null);
}

export async function closeGroup(groupId: string): Promise<CloseResult> {
  const group = await getSharedGroup(groupId);
  if (!group) return { ok: false, error: "That group could not be found." };

  // Already closed. The orders exist and everybody has been told what they
  // owe, so this must change nothing: a second caller arriving late must not
  // re-price something somebody is in the middle of paying.
  if (group.closed_at) {
    const made = await groupOrders(groupId);
    return {
      ok: true,
      alreadyClosed: true,
      share: made[0]?.fee ?? 0,
      people: made.length,
      items: 0,
    };
  }

  const everybody = await groupCarts(groupId);

  // Only the ones who can actually travel. Somebody still choosing, or who
  // never said where their food goes, has nowhere for it to be delivered, so
  // there is nothing to order and nothing to charge them. They are left where
  // they are rather than turned into an order that cannot be fulfilled.
  const waiting = everybody.filter(isReady);
  const notReady = everybody.length - waiting.length;
  if (notReady > 0) {
    console.error(`closing group ${groupId} without ${notReady} who were not ready`);
  }

  // A link somebody made and never used, whose car has now gone. Shut it so
  // the clock stops coming back to it every minute.
  if (waiting.length === 0) {
    await db()
      .from("order_groups")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", groupId)
      .is("closed_at", null);
    return { ok: false, error: "Nobody has ordered in that group." };
  }

  const carried = countCartItems(waiting);

  const { data: batch } = await db()
    .from("batches")
    .select("flash_fee, kind, deliver_at")
    .eq("id", group.batch_id)
    .maybeSingle();

  // A group that picked a time is a car to themselves at a time of their
  // choosing, so it is priced off that ladder and not the run one. Split
  // evenly either way, which is the deal they all agreed to.
  const sameDay = batch?.kind === "same_day";
  const share = sameDay
    ? await evenSameDayShare(
        carried,
        waiting.length,
        (batch?.deliver_at as string | null) ?? null
      )
    : evenShare(
        carried,
        waiting.length,
        (batch?.flash_fee as number | null) ?? null,
        await activeBands()
      );

  // Claim the close first. Two callers arriving together, the leader and the
  // clock, must not both go on to make the orders: that would be everybody's
  // food ordered twice.
  const { data: claimed } = await db()
    .from("order_groups")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", groupId)
    .is("closed_at", null)
    .select("id");

  if (!claimed || claimed.length === 0) {
    const made = await groupOrders(groupId);
    return {
      ok: true,
      alreadyClosed: true,
      share: made[0]?.fee ?? 0,
      people: made.length,
      items: carried,
    };
  }

  // Now, and only now, the orders.
  //
  // This is the first moment a fee exists, so it is the first moment an
  // honest order can be written. Each goes through the ordinary path, so the
  // food is priced from the menu here rather than from anything the browser
  // said fifteen minutes ago, coupons are checked, and every customer is
  // bound and given their PIN exactly as a lone order does. The share is the
  // one thing handed down, because it is the one thing an order cannot work
  // out for itself.
  // Asked for here rather than at the top: orders reaches back into this file
  // for the group it is joining, and two modules each holding the other at
  // load time is a cycle nobody should have to reason about.
  const { placeOrder } = await import("./orders");

  let made = 0;
  for (const cart of waiting) {
    const result = await placeOrder({
      batchId: group.batch_id,
      name: cart.name,
      phone: cart.phone,
      hostel: cart.hostel,
      lines: cart.lines,
      coupon: cart.coupon || undefined,
      paymentMethod: cart.payment_method === "card" ? "card" : "transfer",
      customerNote: cart.customer_note,
      partyId: group.id,
      fixedFee: share,
    });

    if (result.ok) {
      made += 1;
      // Gone from the waiting room, because it is an order now. Anything left
      // here would be ordered again by a later close.
      await db().from("group_carts").delete().eq("id", cart.id);
    } else {
      // Their food could not be ordered: a menu item withdrawn while the
      // group filled, a coupon that ran out. The row stays, so it is visible
      // rather than silently dropped, and nobody is charged for it.
      console.error("group order failed for", cart.phone, result.error);
    }
  }

  // One mail for the whole car, now that there is something to act on.
  void announceGroup(groupId);

  return { ok: true, alreadyClosed: false, share, people: made, items: carried };
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
export async function markDone(cartId: string): Promise<CloseResult | null> {
  const groupId = await markCartDone(cartId);
  if (!groupId) return null;

  // When that was the last of them, the group closes there and then rather
  // than making everybody sit out the rest of the clock: waiting fifteen
  // minutes when everyone is finished is fifteen minutes of nobody being able
  // to pay.
  const waiting = await groupCarts(groupId);
  const everybody = waiting.length > 0 && waiting.every((one) => one.done_at !== null);
  return everybody ? closeGroup(groupId) : null;
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
 * The group a link points at, if it can still be added to.
 *
 * The group is made the moment somebody asks for a link now, so the link is
 * its id and there is nothing to bring into being later. A closed group has
 * been priced and everybody in it told what they owe, so nobody else gets in.
 */
export async function joinableGroup(id: string): Promise<SharedGroup | null> {
  const group = await getSharedGroup(id);
  if (!group || !group.closes_at || group.closed_at) return null;
  return group;
}

/**
 * Whoever made the link is the leader, and this is where that becomes a fact
 * the server knows rather than a flag in one browser. Only ever filled in
 * once: the first claim wins, so a second browser cannot take the group.
 */
export async function claimLeader(groupId: string, phone: string): Promise<void> {
  await db()
    .from("order_groups")
    .update({ leader_phone: phone })
    .eq("id", groupId)
    .eq("leader_phone", "");
}
