import { db } from "./supabase";
import { lagosToday } from "./time";
import {
  hasPaid,
  membersOf,
  moneyHeld,
  type Member,
  type RoomStatus,
  type Wish,
} from "./santa";

/**
 * A wish with the shop's side of it: what it would cost us, what we would
 * charge, and where it is bought. Admin only, and the member-facing
 * wishesOf deliberately does not select these columns at all.
 */
export type WishPlan = Wish & {
  costPrice: number;
  sellPrice: number;
  source: string;
};

async function planFor(memberId: string): Promise<WishPlan[]> {
  const { data } = await db()
    .from("santa_wishes")
    .select("*")
    .eq("member_id", memberId)
    .order("sort_order", { ascending: true });

  return ((data ?? []) as Record<string, any>[]).map((row) => ({
    id: row.id,
    memberId: row.member_id,
    title: row.title,
    photos: [row.photo_url ?? "", row.photo_url_2 ?? ""]
      .map((one: string) => one.trim())
      .filter((one: string) => one !== ""),
    note: row.note ?? "",
    estPrice: Number(row.est_price ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    itemId: row.item_id ?? null,
    costPrice: Number(row.cost_price ?? 0),
    sellPrice: Number(row.sell_price ?? 0),
    source: row.source ?? "",
  }));
}

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
  /** Everyone in the room, so admin can see who still owes, and what each
   *  of them asked for. The lists are worth reading before the draw: half
   *  of what students want takes a week to find, and waiting until somebody
   *  has picked it is a week nobody has in December. */
  people: (Member & { wishes: WishPlan[] })[];
  /** How many have written a list. The ones who have not are the ones whose
   *  giver will be stuck at close. */
  withLists: number;
  /** Of those drawn, how many have chosen something. */
  picked: number;
  held: number;
  /** The part of what is held that is ours: one errand fee per paid member. */
  fees: number;
  owing: number;
};

export async function rooms(): Promise<RoomRow[]> {
  const { data } = await db()
    .from("santa_rooms")
    .select("*")
    .order("exchange_date", { ascending: true });

  const out: RoomRow[] = [];
  for (const row of (data ?? []) as Record<string, any>[]) {
    const plain = await membersOf(row.id);
    const people = await Promise.all(
      plain.map(async (one) => ({ ...one, wishes: await planFor(one.id) }))
    );
    const ids = people.map((one) => one.id);

    const withLists = people.filter((one) => one.wishes.length > 0).length;

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
      fees: money.fees,
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
  /** The block the gift is driven to. Empty is a job nobody can finish. */
  forWhomHostel: string;
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
    db().from("santa_members").select("id, name, phone, hostel").in("id", memberIds),
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
      forWhomHostel: who.get(link.receiver_id)?.hostel ?? "",
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

/**
 * One line of somebody's wishlist, with everything needed to decide what to
 * do about it: whose it is, which room, whether their money has landed,
 * whether anybody has chosen it, and the shop's side of it.
 *
 * Flat on purpose. Pricing is a sitting: an hour with every line in front
 * of you, sorted by what still has no price against it. Nested three deep
 * under a room and a person it was a form you had to go hunting for, and
 * the room page is for money and membership, not for an afternoon of
 * working out where to buy twenty things.
 */
export type WishLine = WishPlan & {
  roomId: string;
  roomName: string;
  budget: number;
  roomStatus: RoomStatus;
  exchangeDate: string;
  shareToken: string;
  /** Whose list it is. */
  owner: string;
  ownerPhone: string;
  ownerHostel: string;
  ownerPaid: boolean;
  /** Who is buying it, once somebody has chosen it. Empty until then. */
  chosenBy: string;
  /** Over the room's budget as the member guessed it. */
  overBudget: boolean;
  /** Both prices in, so there is nothing left to work out. */
  priced: boolean;
};

export async function wishLines(): Promise<WishLine[]> {
  const [{ data: wishRows }, { data: memberRows }, { data: roomRows }, { data: pickRows }] =
    await Promise.all([
      db().from("santa_wishes").select("*").order("sort_order", { ascending: true }),
      db().from("santa_members").select("*"),
      db().from("santa_rooms").select("id, name, budget, status, exchange_date, share_token"),
      db().from("santa_assignments").select("giver_id, wish_id").not("wish_id", "is", null),
    ]);

  const who = new Map(
    ((memberRows ?? []) as Record<string, any>[]).map((one) => [one.id, one])
  );
  const roomOf = new Map(((roomRows ?? []) as Record<string, any>[]).map((one) => [one.id, one]));
  const buyerOf = new Map(
    ((pickRows ?? []) as Record<string, any>[]).map((one) => [
      one.wish_id as string,
      who.get(one.giver_id)?.name ?? "",
    ])
  );

  const out: WishLine[] = [];
  for (const row of (wishRows ?? []) as Record<string, any>[]) {
    const owner = who.get(row.member_id);
    // A list belonging to somebody who has left the room is not work.
    if (!owner || owner.left_at) continue;
    const room = roomOf.get(owner.room_id);
    if (!room) continue;

    const costPrice = Number(row.cost_price ?? 0);
    const sellPrice = Number(row.sell_price ?? 0);
    const estPrice = Number(row.est_price ?? 0);

    out.push({
      id: row.id,
      memberId: row.member_id,
      title: row.title,
      photos: [row.photo_url ?? "", row.photo_url_2 ?? ""]
      .map((one: string) => one.trim())
      .filter((one: string) => one !== ""),
      note: row.note ?? "",
      estPrice,
      sortOrder: Number(row.sort_order ?? 0),
      itemId: row.item_id ?? null,
      costPrice,
      sellPrice,
      source: row.source ?? "",
      roomId: room.id,
      roomName: room.name,
      budget: Number(room.budget ?? 0),
      roomStatus: room.status,
      exchangeDate: room.exchange_date,
      shareToken: room.share_token,
      owner: owner.name ?? "",
      ownerPhone: owner.phone ?? "",
      ownerHostel: owner.hostel ?? "",
      ownerPaid: owner.paid_at !== null,
      chosenBy: buyerOf.get(row.id) ?? "",
      overBudget: estPrice > 0 && estPrice > Number(room.budget ?? 0),
      priced: costPrice > 0 && sellPrice > 0,
    });
  }

  // Chosen first, because somebody is waiting on those; then the ones still
  // without a price, which is the whole point of the page; then by room so
  // one person's list stays together.
  return out.sort((a, b) => {
    if ((a.chosenBy !== "") !== (b.chosenBy !== "")) return a.chosenBy !== "" ? -1 : 1;
    if (a.priced !== b.priced) return a.priced ? 1 : -1;
    const room = a.roomName.localeCompare(b.roomName);
    if (room !== 0) return room;
    const person = a.owner.localeCompare(b.owner);
    return person !== 0 ? person : a.sortOrder - b.sortOrder;
  });
}

/**
 * Which numbers are in a Secret Santa room, and which rooms.
 *
 * A room is now a door into the shop: somebody joins one having never
 * ordered, and a customer card reading "0 orders" against a name nobody
 * recognises is a puzzle rather than a fact. This is what turns it back
 * into a fact.
 */
export async function santaRooms(): Promise<Map<string, string[]>> {
  const [{ data: memberRows }, { data: roomRows }] = await Promise.all([
    db().from("santa_members").select("phone, room_id").is("left_at", null),
    db().from("santa_rooms").select("id, name"),
  ]);

  const named = new Map(((roomRows ?? []) as Record<string, any>[]).map((one) => [one.id, one.name]));
  const out = new Map<string, string[]>();
  for (const row of (memberRows ?? []) as Record<string, any>[]) {
    const name = named.get(row.room_id);
    if (!name) continue;
    const had = out.get(row.phone) ?? [];
    if (!had.includes(name)) had.push(name);
    out.set(row.phone, had);
  }
  return out;
}
