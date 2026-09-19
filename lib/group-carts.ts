import { db } from "./supabase";
import type { CartLine } from "./types";

export type GroupCart = {
  id: string;
  group_id: string;
  /** The seat, held by the browser that took it. Not the phone number: the
   *  number is asked for later, once the food is chosen. */
  member_token: string;
  phone: string;
  name: string;
  hostel: string;
  lines: CartLine[];
  payment_method: string;
  customer_note: string;
  coupon: string;
  /** Set when they say their food is finished. */
  finalised_at: string | null;
  /** Set when they are finished and we know where their food goes. */
  done_at: string | null;
  created_at: string;
};

/** Ready to travel: their food is settled and we know how to deliver it. */
export function isReady(cart: GroupCart): boolean {
  return (
    cart.finalised_at !== null &&
    cart.phone.trim() !== "" &&
    cart.hostel.trim() !== "" &&
    cart.lines.length > 0
  );
}

/**
 * Food put into a shared delivery, held until the group closes.
 *
 * One row per person. Checking out again replaces what they had, because
 * somebody adding a drink they forgot is the same person in the same car, not
 * a second seat in it.
 */
export async function takeSeat(args: {
  groupId: string;
  token: string;
  name: string;
}): Promise<string | null> {
  const { data, error } = await db()
    .from("group_carts")
    .upsert(
      {
        group_id: args.groupId,
        member_token: args.token,
        name: args.name,
        phone: "",
      },
      { onConflict: "group_id,member_token", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (error) {
    console.error("takeSeat failed:", error.message);
    return null;
  }
  return (data?.id as string) ?? null;
}

/** The food somebody has chosen, and that they are finished choosing. */
export async function finaliseSeat(args: {
  groupId: string;
  token: string;
  lines: CartLine[];
}): Promise<boolean> {
  const { error } = await db()
    .from("group_carts")
    .update({
      lines: args.lines,
      finalised_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("group_id", args.groupId)
    .eq("member_token", args.token);

  if (error) console.error("finaliseSeat failed:", error.message);
  return !error;
}

/** Where the food goes, filled in while they wait for everybody else. */
export async function saveSeatDetails(args: {
  groupId: string;
  token: string;
  phone: string;
  hostel: string;
  note: string;
  paymentMethod: "transfer" | "card";
}): Promise<boolean> {
  const { error } = await db()
    .from("group_carts")
    .update({
      phone: args.phone,
      hostel: args.hostel,
      customer_note: args.note,
      payment_method: args.paymentMethod,
      done_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("group_id", args.groupId)
    .eq("member_token", args.token);

  if (error) console.error("saveSeatDetails failed:", error.message);
  return !error;
}

/** The seat this browser holds in a group, if it holds one. */
export async function seatFor(
  groupId: string,
  token: string
): Promise<GroupCart | null> {
  const { data } = await db()
    .from("group_carts")
    .select("*")
    .eq("group_id", groupId)
    .eq("member_token", token)
    .maybeSingle();
  return (data as GroupCart) ?? null;
}

/** Everybody waiting in one shared delivery, in the order they arrived. */
export async function groupCarts(groupId: string): Promise<GroupCart[]> {
  const { data } = await db()
    .from("group_carts")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at");
  return (data ?? []) as GroupCart[];
}

/** "I have finished ordering", from one person in a shared delivery. */
export async function markCartDone(cartId: string): Promise<string | null> {
  const { data } = await db()
    .from("group_carts")
    .update({ finalised_at: new Date().toISOString() })
    .eq("id", cartId)
    .select("group_id")
    .single();
  return (data?.group_id as string) ?? null;
}

/** How many containers are travelling, which is what the band is worked out on. */
export function countCartItems(carts: GroupCart[]): number {
  return carts.reduce(
    (sum, cart) => sum + cart.lines.reduce((n, line) => n + (line.qty ?? 0), 0),
    0
  );
}

/**
 * What the food in these carts is worth, for showing on the group page.
 *
 * Display only. Nothing is charged from this: every order is priced from the
 * menu again at the close, which is the only place price is ever decided. It
 * exists because "2 items" tells somebody far less than "2 items, 3,600",
 * and the group is a thing people read while deciding whether to join.
 */
export async function cartValues(
  carts: GroupCart[]
): Promise<Map<string, { value: number; summary: string }>> {
  const out = new Map<string, { value: number; summary: string }>();
  if (carts.length === 0) return out;

  const itemIds = [...new Set(carts.flatMap((c) => c.lines.map((l) => l.menu_item_id)))];
  const optionIds = [
    ...new Set(carts.flatMap((c) => c.lines.flatMap((l) => l.option_ids ?? []))),
  ];

  const [{ data: items }, { data: options }] = await Promise.all([
    db().from("menu_items").select("id, name, price_food").in("id", itemIds),
    optionIds.length > 0
      ? db().from("item_options").select("id, price_delta").in("id", optionIds)
      : Promise.resolve({ data: [] as { id: string; price_delta: number }[] }),
  ]);

  const price = new Map((items ?? []).map((i) => [i.id as string, i.price_food as number]));
  const named = new Map((items ?? []).map((i) => [i.id as string, i.name as string]));
  const delta = new Map(
    (options ?? []).map((o) => [o.id as string, o.price_delta as number])
  );

  for (const cart of carts) {
    out.set(cart.id, {
      value: cart.lines.reduce((sum, line) => {
        const unit =
          (price.get(line.menu_item_id) ?? 0) +
          (line.option_ids ?? []).reduce((extra, id) => extra + (delta.get(id) ?? 0), 0);
        return sum + unit * (line.qty ?? 0);
      }, 0),
      // What they actually put in, because a group cart that only says "2
      // items" is not a cart anybody can look at.
      summary: cart.lines
        .map((line) => `${line.qty}× ${named.get(line.menu_item_id) ?? "something"}`)
        .join(", "),
    });
  }
  return out;
}
