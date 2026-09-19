import { db } from "./supabase";
import { getSharedGroup, groupOrders, shareNow } from "./groups";
import { cartValues, groupCarts, isReady, type GroupCart } from "./group-carts";
import { getBatch } from "./batches";
import { shortRef } from "./links";
import type { Batch } from "./types";

/** Where somebody has got to, which is the whole point of the board. */
export type Stage = "shopping" | "details" | "ready" | "paid" | "unpaid";

export type Member = {
  orderId: string;
  /** What goes in the address bar for this order: the short code once it is
   *  a real order, and the seat's own id while it is still a seat. */
  link: string;
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
  /** The seven character code the shareable link uses. */
  short?: string | null;
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
    /** Whether the reader is the one who made the link. */
    isLeader: boolean;
    hasFood: boolean;
    phone: string;
    hostel: string;
    note: string;
    /** How they said they would pay, so a form asking again opens on it. */
    paymentMethod: "transfer" | "card";
  } | null;
  /** Whether this car is one they picked a time for, rather than a run. */
  sameDay: boolean;
  /** Their food is still waiting after the close, because they never gave a
   *  number for it to be delivered to. */
  strandedItems: number;
  /** What delivery would cost each of them if it closed now. Moves as people
   *  add food and as people join, which is the whole point of sharing one. */
  eachNow: number;
  /** The promotion pricing the car, when one is. */
  offer: string;
};

/**
 * Where a seat has got to, read from what it actually holds.
 *
 * This used to say "details" for anything finalised that could not travel,
 * which meant a seat with a number and a block but no food asked for the
 * number and the block again, with both already filled in. What is missing
 * is what to ask for: no food is shopping, no address is details, and
 * everything is ready.
 */
function stageOf(cart: GroupCart): Stage {
  if (isReady(cart)) return "ready";
  if (cart.lines.length === 0) return "shopping";
  return "details";
}

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

  // Everything past this point uses the group's real id: the link may have
  // carried the short code, which nothing else knows about.
  const [orders, batch] = await Promise.all([
    groupOrders(group.id),
    getBatch(group.batch_id),
  ]);
  if (!batch) return null;

  // Before it closes there are no orders: the food waits in the group, because
  // nobody has a delivery fee to put on an order yet. After it closes there
  // are, and they are the bill.
  const everySeat = await groupCarts(group.id);
  const waiting = group.closed_at ? [] : everySeat;
  // A seat left behind by the close: food chosen, no number given, so there
  // was no order to make out of it.
  const strandedSeat =
    group.closed_at && seat !== ""
      ? everySeat.find((cart) => cart.member_token === seat && cart.lines.length > 0)
      : undefined;
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
        link: shortRef(order),
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
        link: cart.id,
        stage: stageOf(cart),
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

  // Once: it reads every seat and prices the car, which is not work to do
  // twice for two fields of the same answer.
  const running = group.closed_at
    ? { each: 0, offer: "" }
    : await shareNow(group.id);

  return {
    id: group.id,
    short: group.short ?? null,
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
        stage: stageOf(seated),
        // The leader took the first seat when they made the link.
        isLeader: waiting[0]?.member_token === seated.member_token,
        hasFood: seated.lines.length > 0,
        phone: seated.phone ?? "",
        hostel: seated.hostel ?? "",
        note: seated.customer_note ?? "",
        paymentMethod: (seated.payment_method === "card" ? "card" : "transfer") as
          | "transfer"
          | "card",
      };
    })(),
    sameDay: batch.kind === "same_day",
    eachNow: running.each,
    offer: running.offer ?? "",
    strandedItems: strandedSeat
      ? strandedSeat.lines.reduce((sum, line) => sum + (line.qty ?? 0), 0)
      : 0,
  };
}
