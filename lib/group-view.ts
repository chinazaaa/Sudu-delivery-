import { db } from "./supabase";
import { getSharedGroup, groupOrders } from "./groups";
import { cartValues, groupCarts, isReady } from "./group-carts";
import { getBatch } from "./batches";
import type { Batch } from "./types";

/** Where somebody has got to, which is the whole point of the board. */
export type Stage = "shopping" | "details" | "ready" | "paid" | "unpaid";

export type Member = {
  orderId: string;
  stage: Stage;
  /** Whether this is the person reading the page. */
  isMine: boolean;
  name: string;
  items: number;
  food: number;
  done: boolean;
  paid: boolean;
  isLeader: boolean;
  /** What they put in, in words. Empty until they have chosen something. */
  summary: string;
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
  /** The seat this browser holds, if it holds one and has not finished. */
  mine: {
    stage: Stage;
    hasFood: boolean;
    phone: string;
    hostel: string;
    note: string;
  } | null;
  /** Whether this car is one they picked a time for, rather than a run. */
  sameDay: boolean;
};

/**
 * One shared delivery, as everybody in it sees it.
 *
 * A group is real from the moment somebody asks for a link, so this has to
 * work with nobody in it yet. That empty state is the first thing the person
 * who made the link sees, and the first thing their friends see when they
 * open it, so it cannot be a missing page.
 */
export async function groupView(
  groupId: string,
  /** The seat this browser holds, so it can be shown as theirs. Never leaves
   *  the server: only the flag does. */
  seat = ""
): Promise<GroupView | null> {
  const group = await getSharedGroup(groupId);
  if (!group || !group.closes_at) return null;

  const [orders, batch] = await Promise.all([
    groupOrders(groupId),
    getBatch(group.batch_id),
  ]);
  if (!batch) return null;

  // Before it closes there are no orders: the food waits in the group, because
  // nobody has a delivery fee to put on an order yet. After it closes there
  // are, and they are the bill.
  const waiting = group.closed_at ? [] : await groupCarts(groupId);
  const worth = await cartValues(waiting);

  const { data: rows } =
    orders.length === 0
      ? { data: [] as { order_id: string; qty: number }[] }
      : await db()
          .from("order_items")
          .select("order_id, qty")
          .in("order_id", orders.map((one) => one.id));

  const countFor = (id: string) =>
    (rows ?? [])
      .filter((row) => row.order_id === id)
      .reduce((sum, row) => sum + (row.qty as number), 0);

  const members: Member[] = group.closed_at
    ? orders.map((order) => ({
        orderId: order.id,
        stage: (order.status !== "pending" ? "paid" : "unpaid") as Stage,
        isMine: false,
        name: order.for_name ?? order.customer_name,
        items: countFor(order.id),
        food: order.subtotal_food,
        done: true,
        paid: order.status !== "pending",
        isLeader: group.leader_phone !== "" && order.customer_phone === group.leader_phone,
        summary: "",
        phone: "",
      }))
    : waiting.map((cart) => ({
        orderId: cart.id,
        stage: (isReady(cart)
          ? "ready"
          : cart.finalised_at
            ? "details"
            : "shopping") as Stage,
        isMine: seat !== "" && cart.member_token === seat,
        name: cart.name,
        items: cart.lines.reduce((sum, line) => sum + (line.qty ?? 0), 0),
        food: worth.get(cart.id)?.value ?? 0,
        summary: worth.get(cart.id)?.summary ?? "",
        done: cart.done_at !== null,
        paid: false,
        isLeader: group.leader_phone !== "" && cart.phone === group.leader_phone,
        // Only for somebody being waited on, and only while it is open. There
        // is no other reason for anybody to have their number.
        phone: cart.done_at ? "" : cart.phone,
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
    ready: members.filter((one) => one.stage === "ready").length,
    mine: (() => {
      const seated = waiting.find((cart) => seat !== "" && cart.member_token === seat);
      if (!seated) return null;
      return {
        stage: (isReady(seated)
          ? "ready"
          : seated.finalised_at
            ? "details"
            : "shopping") as Stage,
        hasFood: seated.lines.length > 0,
        phone: seated.phone ?? "",
        hostel: seated.hostel ?? "",
        note: seated.customer_note ?? "",
      };
    })(),
    sameDay: batch.kind === "same_day",
  };
}
