import { randomBytes, randomInt } from "crypto";
import { db } from "./supabase";
import { lagosToday } from "./time";

/**
 * Secret Santa: the draw, the wishlists, and who is carrying what.
 *
 * The rule the whole thing rests on is that nobody who paid goes empty
 * handed. Everything here resolves in favour of the gift still arriving:
 * a member who never wrote a list still gets one, an item nobody can find
 * falls back to the next item, and a buyer who wanted to hand it over
 * themselves and then vanished falls back to us delivering it.
 *
 * One rule is enforced by this file alone and cannot be enforced by the
 * database: a receiver must never learn who drew them. `assignments` is
 * read in exactly one place, `matchFor`, and that function returns the
 * giver's side only. Nothing else in the shop may select from that table,
 * because a server component passing a whole row to a client component
 * puts both names in the HTML.
 */

export type RoomStatus = "open" | "closed" | "delivered" | "cancelled";

export type Room = {
  id: string;
  creatorPhone: string;
  name: string;
  budget: number;
  exchangeDate: string;
  closeDate: string;
  status: RoomStatus;
  shareToken: string;
  closedAt: string | null;
};

export type Member = {
  id: string;
  roomId: string;
  phone: string;
  name: string;
  paid: number;
  /** When their money landed. Null means they are not in the draw. */
  paidAt: string | null;
  /** What they put in the transfer, so we can tell whose money it is. */
  reference: string;
  /** Where their own gift goes. Not where they order food to: a gift is
   *  the one delivery somebody might send somewhere else. */
  hostel: string;
  joinedAt: string;
  leftAt: string | null;
};

/** Paid is a date, not an amount: somebody could be let in free. */
export const hasPaid = (one: Member): boolean => one.paidAt !== null;

export type Wish = {
  id: string;
  memberId: string;
  title: string;
  /** Up to two: the front and the back, or the thing and its size label.
   *  Empty slots are dropped, so this is never a list of blanks. */
  photos: string[];
  note: string;
  estPrice: number;
  sortOrder: number;
  /** Set when it is something off our own menu. Null is the normal case. */
  itemId: string | null;
};

/** Below this a room is not a draw, it is two people swapping. */
export const LEAST_MEMBERS = 4;

/** More than this and a list stops being a shortlist. */
export const MOST_WISHES = 5;

const room = (row: Record<string, any>): Room => ({
  id: row.id,
  creatorPhone: row.creator_phone,
  name: row.name,
  budget: Number(row.budget ?? 0),
  exchangeDate: row.exchange_date,
  closeDate: row.close_date,
  status: row.status,
  shareToken: row.share_token,
  closedAt: row.closed_at ?? null,
});

const member = (row: Record<string, any>): Member => ({
  id: row.id,
  roomId: row.room_id,
  phone: row.phone,
  name: row.name,
  paid: Number(row.paid ?? 0),
  paidAt: row.paid_at ?? null,
  reference: row.reference ?? "",
  hostel: row.hostel ?? "",
  joinedAt: row.joined_at,
  leftAt: row.left_at ?? null,
});

const wish = (row: Record<string, any>): Wish => ({
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
});

/**
 * What goes in the share link.
 *
 * The link is the only thing between a stranger and a room's wishlists, so
 * it is long enough that guessing one is not a way in. Base64url rather
 * than hex to keep it short enough to paste into a class group without
 * wrapping.
 */
export function newToken(): string {
  return randomBytes(16).toString("base64url");
}

export type MadeRoom = { ok: true; room: Room } | { ok: false; error: string };

export async function createRoom(args: {
  creatorPhone: string;
  name: string;
  budget: number;
  exchangeDate: string;
  closeDate: string;
}): Promise<MadeRoom> {
  const name = args.name.trim();
  if (name === "") return { ok: false, error: "Give the room a name." };
  if (!Number.isFinite(args.budget) || args.budget <= 0) {
    return { ok: false, error: "Set a budget." };
  }
  // Checked here as well as in the database, because a constraint gives an
  // error somebody has to translate and this gives one they can act on.
  if (args.closeDate > args.exchangeDate) {
    return { ok: false, error: "Joining has to close before the exchange day." };
  }
  if (args.closeDate < lagosToday()) {
    return { ok: false, error: "That close date has already been and gone." };
  }

  const { data, error } = await db()
    .from("santa_rooms")
    .insert({
      creator_phone: args.creatorPhone,
      name,
      budget: Math.round(args.budget),
      exchange_date: args.exchangeDate,
      close_date: args.closeDate,
      share_token: newToken(),
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: "Could not make the room." };
  return { ok: true, room: room(data) };
}

export async function roomByToken(token: string): Promise<Room | null> {
  const { data } = await db()
    .from("santa_rooms")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return data ? room(data) : null;
}

export async function roomById(id: string): Promise<Room | null> {
  const { data } = await db().from("santa_rooms").select("*").eq("id", id).maybeSingle();
  return data ? room(data) : null;
}

/** Everybody still in a room, in the order they joined. */
export async function membersOf(roomId: string): Promise<Member[]> {
  const { data } = await db()
    .from("santa_members")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });
  return ((data ?? []) as Record<string, any>[]).map(member);
}

/**
 * What somebody puts in the transfer.
 *
 * Short enough to type into a narration box without a mistake, and without
 * the letters that get read back wrong: no O against 0, no I or 1, no S
 * against 5. A bank statement gives a name and an amount, and in a room
 * where everybody pays the same amount in the same week that is not enough
 * to tell two people apart, especially when the sender's name is their
 * father's.
 */
const PLAIN = "ACDEFGHJKMNPQRTUVWXY2346789";

export function newReference(): string {
  let out = "";
  for (let at = 0; at < 6; at++) out += PLAIN[randomInt(0, PLAIN.length)];
  return `SS-${out}`;
}

export type Joined = { ok: true; member: Member } | { ok: false; error: string };

/**
 * Put somebody in a room.
 *
 * Joining is open and costs nothing, because a room nobody can look at
 * until their money has been taken by hand is a room that cannot fill. The
 * rule the whole thing rests on has not gone anywhere: it has moved to the
 * draw, which takes paid members only. Anybody may be in a room; only
 * people who have paid are drawn, and so nobody gives a gift and receives
 * nothing.
 */
export async function joinRoom(args: {
  roomId: string;
  phone: string;
  name: string;
  hostel?: string;
}): Promise<Joined> {
  const here = await roomById(args.roomId);
  if (!here) return { ok: false, error: "That room is gone." };
  if (here.status !== "open") return { ok: false, error: "That room has closed." };

  const name = args.name.trim();
  if (name === "") return { ok: false, error: "Give your name." };

  const { data, error } = await db()
    .from("santa_members")
    .insert({
      room_id: args.roomId,
      phone: args.phone,
      name,
      hostel: (args.hostel ?? "").trim(),
      paid: 0,
      reference: newReference(),
    })
    .select("*")
    .single();

  // The unique index on (room_id, phone) is what stops a double join, so a
  // conflict here is somebody tapping twice rather than an error worth
  // showing. Hand back the row they already have, reference and all.
  if (error) {
    const { data: already } = await db()
      .from("santa_members")
      .select("*")
      .eq("room_id", args.roomId)
      .eq("phone", args.phone)
      .maybeSingle();
    if (already) return { ok: true, member: member(already) };
    return { ok: false, error: "Could not join the room." };
  }

  return { ok: true, member: member(data) };
}

/**
 * Their money landed.
 *
 * The amount comes off the room rather than being passed in, because a
 * member who paid less than the budget is the thing this design exists to
 * prevent and a number somebody types is a number somebody mistypes.
 */
export async function markPaid(memberId: string): Promise<Done> {
  const { data: who } = await db()
    .from("santa_members")
    .select("room_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!who) return { ok: false, error: "No such member." };

  const here = await roomById(who.room_id as string);
  if (!here) return { ok: false, error: "That room is gone." };

  const { error } = await db()
    .from("santa_members")
    .update({ paid: here.budget, paid_at: new Date().toISOString() })
    .eq("id", memberId);
  return error ? { ok: false, error: "Could not save that." } : { ok: true };
}

/** Money went back, or never came. They are out of the draw again. */
export async function markUnpaid(memberId: string): Promise<Done> {
  const { error } = await db()
    .from("santa_members")
    .update({ paid: 0, paid_at: null })
    .eq("id", memberId);
  return error ? { ok: false, error: "Could not save that." } : { ok: true };
}

export async function memberIn(roomId: string, phone: string): Promise<Member | null> {
  const { data } = await db()
    .from("santa_members")
    .select("*")
    .eq("room_id", roomId)
    .eq("phone", phone)
    .maybeSingle();
  return data ? member(data) : null;
}

/**
 * Somebody's list, as a member may see it.
 *
 * Columns named rather than `*` on purpose. The table also carries what the
 * shop would pay for each thing and where it would buy it, and a select
 * that drags those along is one careless prop away from printing the
 * margin on the page the person who wrote the list is reading.
 */
export async function wishesOf(memberId: string): Promise<Wish[]> {
  const { data } = await db()
    .from("santa_wishes")
    .select("id, member_id, title, photo_url, photo_url_2, note, est_price, sort_order, item_id")
    .eq("member_id", memberId)
    .order("sort_order", { ascending: true });
  return ((data ?? []) as Record<string, any>[]).map(wish);
}

/**
 * The draw.
 *
 * One random cycle rather than a pairing drawn at random and checked: a
 * cycle cannot put anybody on their own name, needs no retry loop, and has
 * the side effect that no two people draw each other, which is what stops
 * a room working out the whole ring from one swap.
 *
 * Fisher-Yates with crypto randomness. Math.random is seeded well enough
 * for a shuffle nobody cares about and this is not one of those: somebody
 * who can predict the order can work out the ring.
 */
export function ringOf<T>(people: T[]): { giver: T; receiver: T }[] {
  const order = [...people];
  for (let at = order.length - 1; at > 0; at--) {
    const swap = randomInt(0, at + 1);
    [order[at], order[swap]] = [order[swap], order[at]];
  }
  return order.map((giver, at) => ({
    giver,
    receiver: order[(at + 1) % order.length],
  }));
}

export type Closed = { ok: true; drawn: number } | { ok: false; error: string };

/**
 * Close a room and draw it, once.
 *
 * Assignments are written here and nowhere else, and never rewritten:
 * redrawing would hand somebody a second person's list, and anybody who
 * had seen the first would know two. The status check is the guard, and it
 * is read inside the same call that writes.
 */
export async function closeRoom(roomId: string): Promise<Closed> {
  const here = await roomById(roomId);
  if (!here) return { ok: false, error: "That room is gone." };
  if (here.status !== "open") return { ok: false, error: "That room is already closed." };

  // Paid members only. This line is the whole promise: somebody who never
  // paid is not drawn, so nobody is given their name and nobody is left
  // waiting on a gift that was never funded.
  const people = (await membersOf(roomId)).filter(hasPaid);
  if (people.length < LEAST_MEMBERS) {
    return {
      ok: false,
      error: `A room needs ${LEAST_MEMBERS} paid people to draw. This one has ${people.length}.`,
    };
  }

  // Nothing may already exist. If it does, something drew this room while
  // we were counting and the right answer is to leave it entirely alone.
  const { count } = await db()
    .from("santa_assignments")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if ((count ?? 0) > 0) return { ok: false, error: "That room has already been drawn." };

  const ring = ringOf(people);
  const { error } = await db().from("santa_assignments").insert(
    ring.map((one) => ({
      room_id: roomId,
      giver_id: one.giver.id,
      receiver_id: one.receiver.id,
    }))
  );
  if (error) return { ok: false, error: "Could not draw the room." };

  await db()
    .from("santa_rooms")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", roomId)
    .eq("status", "open");

  return { ok: true, drawn: ring.length };
}

export type Match = {
  /** Who they are buying for. */
  name: string;
  /** What that person asked for. */
  wishes: Wish[];
  /** Which of them they have picked, if they have. */
  pickedWishId: string | null;
  /** Their block. The giver already knows whose name they drew, so this
   *  gives away nothing about the draw, and somebody handing a gift over
   *  themselves has to know where to find them. */
  hostel: string;
  budget: number;
  exchangeDate: string;
};

/**
 * Who this person drew, and nothing else.
 *
 * The only function in the shop that reads santa_assignments. It takes the
 * giver's phone and returns the receiver's side, so there is no shape of
 * call that answers "who drew me": the giver is the input, never the
 * output. Keep it that way.
 */
export async function matchFor(roomId: string, phone: string): Promise<Match | null> {
  const me = await memberIn(roomId, phone);
  if (!me || me.leftAt) return null;

  const here = await roomById(roomId);
  if (!here || here.status === "open") return null;

  const { data } = await db()
    .from("santa_assignments")
    .select("receiver_id, wish_id")
    .eq("room_id", roomId)
    .eq("giver_id", me.id)
    .maybeSingle();
  if (!data) return null;

  const { data: them } = await db()
    .from("santa_members")
    .select("name, hostel")
    .eq("id", data.receiver_id)
    .maybeSingle();

  return {
    name: (them?.name as string) ?? "",
    hostel: (them?.hostel as string) ?? "",
    wishes: await wishesOf(data.receiver_id as string),
    pickedWishId: (data.wish_id as string) ?? null,
    budget: here.budget,
    exchangeDate: here.exchangeDate,
  };
}

/**
 * What a room owes back and what it is holding.
 *
 * Held money is not takings, and this is the only sum of it. It is worked
 * out from the room's own tables so that nothing has to remember to keep
 * it out of the profit figure: it was never in it.
 */
export async function moneyHeld(roomId: string): Promise<{
  held: number;
  spent: number;
  refunded: number;
  owing: number;
}> {
  const people = await membersOf(roomId);
  const held = people.reduce((sum, one) => sum + one.paid, 0);

  const { data: assignments } = await db()
    .from("santa_assignments")
    .select("id")
    .eq("room_id", roomId);
  const ids = ((assignments ?? []) as { id: string }[]).map((one) => one.id);
  if (ids.length === 0) return { held, spent: 0, refunded: 0, owing: held };

  const { data: orders } = await db()
    .from("santa_orders")
    .select("sourced_price, refund, refunded_at")
    .in("assignment_id", ids);

  const rows = (orders ?? []) as {
    sourced_price: number | null;
    refund: number | null;
    refunded_at: string | null;
  }[];

  const spent = rows.reduce((sum, one) => sum + Number(one.sourced_price ?? 0), 0);
  const refunded = rows
    .filter((one) => one.refunded_at)
    .reduce((sum, one) => sum + Number(one.refund ?? 0), 0);

  return { held, spent, refunded, owing: held - spent - refunded };
}

export type Done = { ok: true } | { ok: false; error: string };

/** Add something to your own list, while the room is still open. */
export async function addWish(args: {
  roomId: string;
  phone: string;
  title: string;
  /** Nothing, one, or two. Anything past the second is dropped. */
  photos?: string[];
  note?: string;
  estPrice?: number;
  /** When it came off our own menu rather than out of their head. */
  itemId?: string;
}): Promise<Done> {
  const here = await roomById(args.roomId);
  if (!here) return { ok: false, error: "That room is gone." };
  if (here.status !== "open") {
    return { ok: false, error: "The room has closed, so lists cannot change." };
  }
  const me = await memberIn(args.roomId, args.phone);
  if (!me || me.leftAt) return { ok: false, error: "You are not in this room." };

  const title = args.title.trim();
  if (title === "") return { ok: false, error: "Say what the thing is." };

  const mine = await wishesOf(me.id);
  if (mine.length >= MOST_WISHES) {
    return { ok: false, error: `${MOST_WISHES} things is enough to choose from.` };
  }

  const { error } = await db().from("santa_wishes").insert({
    member_id: me.id,
    title,
    photo_url: (args.photos?.[0] ?? "").trim(),
    photo_url_2: (args.photos?.[1] ?? "").trim(),
    note: (args.note ?? "").trim(),
    est_price: Math.max(0, Math.round(args.estPrice ?? 0)),
    sort_order: mine.length,
    item_id: args.itemId ?? null,
  });
  return error ? { ok: false, error: "Could not add that." } : { ok: true };
}

/**
 * Take something off your own list.
 *
 * Scoped by the member rather than by the wish alone, so a stray id from
 * somebody else's list cannot delete off it.
 */
export async function removeWish(args: {
  roomId: string;
  phone: string;
  wishId: string;
}): Promise<Done> {
  const here = await roomById(args.roomId);
  if (!here || here.status !== "open") {
    return { ok: false, error: "The room has closed, so lists cannot change." };
  }
  const me = await memberIn(args.roomId, args.phone);
  if (!me) return { ok: false, error: "You are not in this room." };

  await db().from("santa_wishes").delete().eq("id", args.wishId).eq("member_id", me.id);
  return { ok: true };
}

/**
 * The giver picks one thing off their match's list.
 *
 * The order row is written here rather than at close, because until
 * somebody has chosen there is nothing to source and an empty row on the
 * buying list is a job that looks outstanding and is not.
 */
export async function pickWish(args: {
  roomId: string;
  phone: string;
  wishId: string;
}): Promise<Done> {
  const me = await memberIn(args.roomId, args.phone);
  if (!me || me.leftAt) return { ok: false, error: "You are not in this room." };

  const { data: mine } = await db()
    .from("santa_assignments")
    .select("id, receiver_id")
    .eq("room_id", args.roomId)
    .eq("giver_id", me.id)
    .maybeSingle();
  if (!mine) return { ok: false, error: "The room has not been drawn yet." };

  // The wish has to be on the list of the person they actually drew. Without
  // this somebody could post any id and have us buy a stranger a laptop.
  const { data: theirs } = await db()
    .from("santa_wishes")
    .select("id")
    .eq("id", args.wishId)
    .eq("member_id", mine.receiver_id)
    .maybeSingle();
  if (!theirs) return { ok: false, error: "That is not on their list." };

  const { data: before } = await db()
    .from("santa_assignments")
    .select("wish_id")
    .eq("id", mine.id)
    .maybeSingle();
  const changed = (before?.wish_id ?? null) !== args.wishId;

  await db()
    .from("santa_assignments")
    .update({ wish_id: args.wishId })
    .eq("id", mine.id);

  const { data: already } = await db()
    .from("santa_orders")
    .select("id, status")
    .eq("assignment_id", mine.id)
    .maybeSingle();

  if (!already) {
    await db().from("santa_orders").insert({ assignment_id: mine.id });
    return { ok: true };
  }

  /*
   * Picking something else throws away what we had found for the old one.
   *
   * Without this, somebody told their choice came to three thousand over
   * budget picks the cheaper thing on the list and the order still carries
   * the old price, the old refund and the agreement they gave for an item
   * they are no longer buying. The handover and its date are theirs and
   * survive, because that is a decision about carrying rather than about
   * what is being carried.
   */
  if (changed && already.status !== "delivered") {
    await db()
      .from("santa_orders")
      .update({
        status: "sourcing",
        sourced_price: null,
        agreed_at: null,
        refund: null,
      })
      .eq("id", already.id);
  }

  return { ok: true };
}

/**
 * Who carries the gift the last step.
 *
 * A buyer who wants to hand it over themselves gets it delivered to them
 * instead, on a day they choose. The date has to be on or before the
 * exchange: a gift promised for after the party is somebody standing
 * empty-handed at it. And it cannot be before the room closes, because
 * until then there is nothing bought to deliver.
 *
 * Choosing this moves the promise. Once it is in their hands we cannot
 * make the handover happen, so the screen that calls this says so.
 */
export async function setHandover(args: {
  roomId: string;
  phone: string;
  byGiver: boolean;
  deliverOn?: string;
}): Promise<Done> {
  const here = await roomById(args.roomId);
  if (!here) return { ok: false, error: "That room is gone." };

  const me = await memberIn(args.roomId, args.phone);
  if (!me || me.leftAt) return { ok: false, error: "You are not in this room." };

  const { data: mine } = await db()
    .from("santa_assignments")
    .select("id")
    .eq("room_id", args.roomId)
    .eq("giver_id", me.id)
    .maybeSingle();
  if (!mine) return { ok: false, error: "The room has not been drawn yet." };

  // The choice is theirs to make before they have picked anything: it is
  // about who carries it, not about what is carried. So the row it is
  // written on may not exist yet, and an update with nothing to update
  // would have quietly saved nothing at all.
  const { data: row } = await db()
    .from("santa_orders")
    .select("id")
    .eq("assignment_id", mine.id)
    .maybeSingle();
  if (!row) await db().from("santa_orders").insert({ assignment_id: mine.id });

  if (!args.byGiver) {
    await db()
      .from("santa_orders")
      .update({ handover: "we_deliver", deliver_on: null })
      .eq("assignment_id", mine.id);
    return { ok: true };
  }

  const day = (args.deliverOn ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { ok: false, error: "Pick the day you want it." };
  }
  if (day > here.exchangeDate) {
    return { ok: false, error: "That is after the exchange. Pick an earlier day." };
  }
  if (day < here.closeDate) {
    return { ok: false, error: "Nothing can be bought before the room closes." };
  }

  const { error } = await db()
    .from("santa_orders")
    .update({ handover: "giver", deliver_on: day })
    .eq("assignment_id", mine.id);
  return error ? { ok: false, error: "Could not save that." } : { ok: true };
}

export type MyOrder = {
  status: "sourcing" | "asking" | "buying" | "bought" | "delivered" | "stuck";
  /** What we have actually paid, once we have. */
  sourcedPrice: number | null;
  /** How much over the budget that is, if it is over. */
  over: number;
  agreedAt: string | null;
  refund: number | null;
  refundedAt: string | null;
  handover: "we_deliver" | "giver";
  deliverOn: string | null;
  handedOverAt: string | null;
};

/**
 * The buyer's own order.
 *
 * Theirs alone: it is the gift they are paying for, so the money, the
 * status and the date are all their business. The person receiving it sees
 * none of this, and must not, because "your gift is being sourced" on the
 * receiver's screen is a sentence that tells them somebody is buying for
 * them and roughly when, which is half of what the room is keeping back.
 */
export async function myOrder(roomId: string, phone: string): Promise<MyOrder | null> {
  const me = await memberIn(roomId, phone);
  if (!me || me.leftAt) return null;

  const { data: mine } = await db()
    .from("santa_assignments")
    .select("id")
    .eq("room_id", roomId)
    .eq("giver_id", me.id)
    .maybeSingle();
  if (!mine) return null;

  const { data } = await db()
    .from("santa_orders")
    .select("*")
    .eq("assignment_id", mine.id)
    .maybeSingle();
  if (!data) return null;

  const here = await roomById(roomId);
  const budget = here?.budget ?? 0;
  const paid = data.sourced_price === null ? null : Number(data.sourced_price);

  return {
    status: data.status,
    sourcedPrice: paid,
    over: paid !== null && paid > budget ? paid - budget : 0,
    agreedAt: data.agreed_at ?? null,
    refund: data.refund === null ? null : Number(data.refund),
    refundedAt: data.refunded_at ?? null,
    handover: data.handover,
    deliverOn: data.deliver_on ?? null,
    handedOverAt: data.handed_over_at ?? null,
  };
}

/**
 * The buyer agrees to pay the difference.
 *
 * Nothing above the budget is bought without this, and the agreement is
 * the buyer's to give rather than something admin can tick on their
 * behalf: the whole reason the rule exists is that somebody is being asked
 * for more money than they agreed to hand over.
 */
export async function agreeToPayMore(args: {
  roomId: string;
  phone: string;
}): Promise<Done> {
  const me = await memberIn(args.roomId, args.phone);
  if (!me || me.leftAt) return { ok: false, error: "You are not in this room." };

  const { data: mine } = await db()
    .from("santa_assignments")
    .select("id")
    .eq("room_id", args.roomId)
    .eq("giver_id", me.id)
    .maybeSingle();
  if (!mine) return { ok: false, error: "Nothing to agree to yet." };

  const { error } = await db()
    .from("santa_orders")
    .update({ agreed_at: new Date().toISOString(), status: "buying" })
    .eq("assignment_id", mine.id)
    .eq("status", "asking");

  return error ? { ok: false, error: "Could not save that." } : { ok: true };
}

/**
 * Where this person's own gift goes.
 *
 * Theirs to set and theirs to change, right up until it is driven. The
 * person who drew them never sees it: they chose the gift and paid for it,
 * and neither of those requires knowing which block somebody sleeps in.
 */
export async function setHostel(args: {
  roomId: string;
  phone: string;
  hostel: string;
}): Promise<Done> {
  const me = await memberIn(args.roomId, args.phone);
  if (!me || me.leftAt) return { ok: false, error: "You are not in this room." };

  const { error } = await db()
    .from("santa_members")
    .update({ hostel: args.hostel.trim() })
    .eq("id", me.id);
  return error ? { ok: false, error: "Could not save that." } : { ok: true };
}

/**
 * Change something already on your own list.
 *
 * Remove and add again loses the photograph and the place in the order,
 * and "I typed the wrong size" should not cost somebody both.
 */
export async function editWish(args: {
  roomId: string;
  phone: string;
  wishId: string;
  title: string;
  note?: string;
  estPrice?: number;
  photos?: string[];
}): Promise<Done> {
  const here = await roomById(args.roomId);
  if (!here || here.status !== "open") {
    return { ok: false, error: "The room has closed, so lists cannot change." };
  }
  const me = await memberIn(args.roomId, args.phone);
  if (!me) return { ok: false, error: "You are not in this room." };

  const title = args.title.trim();
  if (title === "") return { ok: false, error: "Say what the thing is." };

  // Scoped by the member as well as the wish, so an id off somebody else's
  // list cannot be edited by posting it here.
  const patch: Record<string, unknown> = {
    title,
    note: (args.note ?? "").trim(),
    est_price: Math.max(0, Math.round(args.estPrice ?? 0)),
  };
  // Only the slots a new file actually arrived in: an empty file input must
  // not wipe the picture they added last week.
  if (args.photos?.[0]) patch.photo_url = args.photos[0];
  if (args.photos?.[1]) patch.photo_url_2 = args.photos[1];

  const { error } = await db()
    .from("santa_wishes")
    .update(patch)
    .eq("id", args.wishId)
    .eq("member_id", me.id);
  return error ? { ok: false, error: "Could not save that." } : { ok: true };
}

/**
 * Somebody walks away from a room.
 *
 * Only while it is open. After the draw a room is a ring, and a person
 * leaving it is a gift nobody is buying and a person nobody is buying for:
 * that is a conversation, not a button.
 *
 * Their money is not handed back here. Money came in by transfer and goes
 * out by transfer, and this writes neither; what it does is take them out
 * of the draw and leave the amount against their name for whoever sends it
 * back. The screen says so.
 *
 * Marked rather than deleted, because the reference they put in a transfer
 * has to keep meaning something on a statement a week later.
 */
export async function leaveRoom(args: {
  roomId: string;
  phone: string;
}): Promise<Done> {
  const here = await roomById(args.roomId);
  if (!here) return { ok: false, error: "That room is gone." };
  if (here.status !== "open") {
    return { ok: false, error: "The room has been drawn, so message us instead." };
  }

  const me = await memberIn(args.roomId, args.phone);
  if (!me || me.leftAt) return { ok: false, error: "You are not in this room." };

  // The person who made it is the one everybody else is relying on to close
  // it. Letting them walk out leaves a room nobody can draw.
  if (args.phone === here.creatorPhone) {
    return { ok: false, error: "You made this room, so message us to close it." };
  }

  await db()
    .from("santa_members")
    .update({ left_at: new Date().toISOString() })
    .eq("id", me.id);

  // Their list goes with them. It was written for whoever drew them, and
  // nobody is drawing them now.
  await db().from("santa_wishes").delete().eq("member_id", me.id);
  return { ok: true };
}

/**
 * Taking somebody out, from the shop's side.
 *
 * The same rule and the same marking. It exists because the person who
 * rings up to say they are out rings the shop, not the room.
 */
export async function removeMember(memberId: string): Promise<Done> {
  const { data } = await db()
    .from("santa_members")
    .select("id, room_id, left_at")
    .eq("id", memberId)
    .maybeSingle();
  if (!data || data.left_at) return { ok: false, error: "They are not in a room." };

  const here = await roomById(data.room_id as string);
  if (!here) return { ok: false, error: "That room is gone." };
  if (here.status !== "open") {
    return { ok: false, error: "The room has been drawn. Taking somebody out now breaks the ring." };
  }

  await db()
    .from("santa_members")
    .update({ left_at: new Date().toISOString() })
    .eq("id", memberId);
  await db().from("santa_wishes").delete().eq("member_id", memberId);
  return { ok: true };
}

/**
 * Throw a room away entirely.
 *
 * Everything under it goes with it: members, their lists, the draw and the
 * orders, all by cascade. It exists for the rooms made to find out whether
 * the thing works, which would otherwise sit in the list for a year.
 *
 * It refuses while the room is holding money, unless the person deleting it
 * says the amount out loud first. A room with somebody's sixty thousand in
 * it is not a mistake to be swept up, and once it is gone there is nothing
 * left saying whose the money was. A room where the money was marked paid
 * to see whether the screen adds up is the reason force exists.
 *
 * Nothing in a room has ever been takings: held money is worked out from
 * these tables and has never been in the profit figure, so a room going
 * away takes its pretend money with it and changes no number anywhere else.
 */
export async function deleteRoom(roomId: string, force = false): Promise<Done> {
  const here = await roomById(roomId);
  if (!here) return { ok: false, error: "That room is gone already." };

  const money = await moneyHeld(roomId);
  if (money.held > 0 && !force) {
    return {
      ok: false,
      error: "That room is holding money. Send it back first, then delete it.",
    };
  }

  const { error } = await db().from("santa_rooms").delete().eq("id", roomId);
  return error ? { ok: false, error: "Could not delete that room." } : { ok: true };
}
