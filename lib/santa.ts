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
  joinedAt: string;
  leftAt: string | null;
};

export type Wish = {
  id: string;
  memberId: string;
  title: string;
  photoUrl: string;
  note: string;
  estPrice: number;
  sortOrder: number;
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
  joinedAt: row.joined_at,
  leftAt: row.left_at ?? null,
});

const wish = (row: Record<string, any>): Wish => ({
  id: row.id,
  memberId: row.member_id,
  title: row.title,
  photoUrl: row.photo_url ?? "",
  note: row.note ?? "",
  estPrice: Number(row.est_price ?? 0),
  sortOrder: Number(row.sort_order ?? 0),
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
 * Put somebody in a room, once their money is in.
 *
 * The payment is the caller's job: this writes the row that says it
 * happened, and the row existing is what makes them a member. There is
 * deliberately no half-joined state to tidy up later.
 */
export type Joined = { ok: true; member: Member } | { ok: false; error: string };

export async function joinRoom(args: {
  roomId: string;
  phone: string;
  name: string;
  paid: number;
}): Promise<Joined> {
  const here = await roomById(args.roomId);
  if (!here) return { ok: false, error: "That room is gone." };
  if (here.status !== "open") return { ok: false, error: "That room has closed." };
  if (args.paid < here.budget) {
    return { ok: false, error: "The whole budget has to be paid to join." };
  }

  const { data, error } = await db()
    .from("santa_members")
    .insert({
      room_id: args.roomId,
      phone: args.phone,
      name: args.name.trim(),
      paid: Math.round(args.paid),
    })
    .select("*")
    .single();

  // The unique index on (room_id, phone) is what stops a double join, so a
  // conflict here is somebody tapping twice rather than an error worth
  // showing. Hand back the row they already have.
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

export async function memberIn(roomId: string, phone: string): Promise<Member | null> {
  const { data } = await db()
    .from("santa_members")
    .select("*")
    .eq("room_id", roomId)
    .eq("phone", phone)
    .maybeSingle();
  return data ? member(data) : null;
}

export async function wishesOf(memberId: string): Promise<Wish[]> {
  const { data } = await db()
    .from("santa_wishes")
    .select("*")
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

  const people = await membersOf(roomId);
  if (people.length < LEAST_MEMBERS) {
    return {
      ok: false,
      error: `A room needs ${LEAST_MEMBERS} people to draw. This one has ${people.length}.`,
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
    .select("name")
    .eq("id", data.receiver_id)
    .maybeSingle();

  return {
    name: (them?.name as string) ?? "",
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
