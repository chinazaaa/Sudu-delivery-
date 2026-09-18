import { db } from "./supabase";
import { getSharedGroup, groupOrders } from "./groups";
import { getBatch } from "./batches";
import type { Batch } from "./types";

export type Member = {
  orderId: string;
  name: string;
  items: number;
  food: number;
  done: boolean;
  paid: boolean;
  isLeader: boolean;
  /** Only carried while the group is still open and this person has not
   *  finished, because the only reason to have it is to chase them. */
  phone: string;
};

export type GroupView = {
  id: string;
  batch: Batch;
  leaderName: string;
  closesAt: string | null;
  closedAt: string | null;
  members: Member[];
  /** Everything in the car, which is what the band is worked out on. */
  items: number;
  /** What each of them owes for delivery, once it has been closed. */
  share: number;
  ready: number;
};

/** One shared delivery, as everybody in it sees it. */
export async function groupView(groupId: string): Promise<GroupView | null> {
  const group = await getSharedGroup(groupId);
  if (!group || !group.closes_at) return null;

  const [orders, batch] = await Promise.all([
    groupOrders(groupId),
    getBatch(group.batch_id),
  ]);
  if (!batch) return null;

  const { data: rows } = await db()
    .from("order_items")
    .select("order_id, qty")
    .in("order_id", orders.map((one) => one.id));

  const countFor = (id: string) =>
    (rows ?? [])
      .filter((row) => row.order_id === id)
      .reduce((sum, row) => sum + (row.qty as number), 0);

  const members: Member[] = orders.map((order) => ({
    orderId: order.id,
    name: order.for_name ?? order.customer_name,
    items: countFor(order.id),
    food: order.subtotal_food,
    done: order.done_at !== null,
    paid: order.status !== "pending",
    isLeader: order.customer_phone === group.leader_phone,
    phone: group.closed_at || order.done_at ? "" : order.customer_phone,
  }));

  return {
    id: group.id,
    batch,
    leaderName: group.leader_name,
    closesAt: group.closes_at,
    closedAt: group.closed_at,
    members,
    items: members.reduce((sum, one) => sum + one.items, 0),
    share: group.closed_at ? orders[0]?.fee ?? 0 : 0,
    ready: members.filter((one) => one.done).length,
  };
}
