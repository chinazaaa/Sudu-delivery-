import { db } from "./supabase";
import { lagosToday } from "./time";
import { hasPaid, membersOf, moneyHeld, type Member, type RoomStatus } from "./santa";

/**
 * What somebody running Secret Santa needs to see.
 *
 * Admin is the only place both halves of a draw are visible, and that is
 * not a leak: a person has to buy the thing, so a person has to know who
 * it is for. The rule is about members, not about us. It does mean this
 * screen is never shown to anybody else, which is what the admin login is
 * already for.
 *
 * Sorted by the day each gift is wanted rather than by room, because a day
 * is what gets packed into a car. A room is how the money is counted and
 * has nothing to do with what is being carried on Tuesday.
 */

export type RoomRow = {
  id: string;
  name: string;
  budget: number;
  status: RoomStatus;
  closeDate: string;
  exchangeDate: string;
  shareToken: string;
  members: number;
  paidCount: number;
  /** Everyone in the room, so admin can see who still owes. */
  people: Member[];
  /** How many have written a list. The ones who have not are the ones whose
   *  giver will be stuck at close. */
  withLists: number;
  /** Of those drawn, how many have chosen something. */
  picked: number;
  held: number;
  owing: number;
};

export async function rooms(): Promise<RoomRow[]> {
  const { data } = await db()
    .from("santa_rooms")
    .select("*")
    .order("exchange_date", { ascending: true });

  const out: RoomRow[] = [];
  for (const row of (data ?? []) as Record<string, any>[]) {
    const people = await membersOf(row.id);
    const ids = people.map((one) => one.id);

    const { data: lists } = ids.length
      ? await db().from("santa_wishes").select("member_id").in("member_id", ids)
      : { data: [] };
    const withLists = new Set(
      ((lists ?? []) as { member_id: string }[]).map((one) => one.member_id)
    ).size;

    const { count: picked } = await db()
      .from("santa_assignments")
      .select("id", { count: "exact", head: true })
      .eq("room_id", row.id)
      .not("wish_id", "is", null);

    const money = await moneyHeld(row.id);

    out.push({
      id: row.id,
      name: row.name,
      budget: Number(row.budget ?? 0),
      status: row.status,
      closeDate: row.close_date,
      exchangeDate: row.exchange_date,
      shareToken: row.share_token,
      members: ids.length,
      paidCount: people.filter(hasPaid).length,
      people,
      withLists,
      picked: picked ?? 0,
      held: money.held,
      owing: money.owing,
    });
  }
  return out;
}

export type Job = {
  orderId: string;
  roomName: string;
  budget: number;
  /** Who is paying for it, and who it is for. */
  buyer: string;
  buyerPhone: string;
  forWhom: string;
  /** What they chose. Null when nobody has chosen yet. */
  wish: { title: string; note: string; estPrice: number } | null;
  status: string;
  sourcedPrice: number | null;
  refund: number | null;
  refundedAt: string | null;
  /** we_deliver, or giver with a day of their own. */
  handover: "we_deliver" | "giver";
  /** The day it has to be in somebody's hands. */
  wantedOn: string;
  byHand: boolean;
  handedOverAt: string | null;
  /** Past its day and still not gone. */
  late: boolean;
};

/**
 * Everything still to be bought or carried, soonest first.
 *
 * A gift the buyer is handing over themselves is wanted on their day; every
 * other gift is wanted on the room's exchange day. Reading both out of one
 * list is the whole point: two lists is how a hand-over gift ends up packed
 * into the exchange-day car.
 */
export async function jobs(): Promise<Job[]> {
  const { data } = await db()
    .from("santa_orders")
    .select("*, santa_assignments!inner(id, room_id, giver_id, receiver_id, wish_id)");

  const rows = (data ?? []) as Record<string, any>[];
  if (rows.length === 0) return [];

  const roomIds = [...new Set(rows.map((one) => one.santa_assignments.room_id))];
  const memberIds = [
    ...new Set(
      rows.flatMap((one) => [one.santa_assignments.giver_id, one.santa_assignments.receiver_id])
    ),
  ];
  const wishIds = rows
    .map((one) => one.santa_assignments.wish_id)
    .filter((one): one is string => Boolean(one));

  const [{ data: roomRows }, { data: memberRows }, { data: wishRows }] = await Promise.all([
    db().from("santa_rooms").select("id, name, budget, exchange_date").in("id", roomIds),
    db().from("santa_members").select("id, name, phone").in("id", memberIds),
    wishIds.length
      ? db().from("santa_wishes").select("id, title, note, est_price").in("id", wishIds)
      : Promise.resolve({ data: [] as Record<string, any>[] }),
  ]);

  const roomOf = new Map(((roomRows ?? []) as Record<string, any>[]).map((one) => [one.id, one]));
  const who = new Map(((memberRows ?? []) as Record<string, any>[]).map((one) => [one.id, one]));
  const wishOf = new Map(((wishRows ?? []) as Record<string, any>[]).map((one) => [one.id, one]));

  const today = lagosToday();

  const out: Job[] = rows.map((row) => {
    const link = row.santa_assignments;
    const room = roomOf.get(link.room_id);
    const wish = link.wish_id ? wishOf.get(link.wish_id) : null;
    const byHand = row.handover === "giver";
    const wantedOn = byHand ? row.deliver_on : (room?.exchange_date ?? "");

    return {
      orderId: row.id,
      roomName: room?.name ?? "",
      budget: Number(room?.budget ?? 0),
      buyer: who.get(link.giver_id)?.name ?? "",
      buyerPhone: who.get(link.giver_id)?.phone ?? "",
      forWhom: who.get(link.receiver_id)?.name ?? "",
      wish: wish
        ? {
            title: wish.title as string,
            note: (wish.note as string) ?? "",
            estPrice: Number(wish.est_price ?? 0),
          }
        : null,
      status: row.status,
      sourcedPrice: row.sourced_price === null ? null : Number(row.sourced_price),
      refund: row.refund === null ? null : Number(row.refund),
      refundedAt: row.refunded_at ?? null,
      handover: byHand ? "giver" : "we_deliver",
      wantedOn,
      byHand,
      handedOverAt: row.handed_over_at ?? null,
      late: wantedOn !== "" && wantedOn < today && row.status !== "delivered",
    };
  });

  return out.sort((a, b) => a.wantedOn.localeCompare(b.wantedOn));
}
