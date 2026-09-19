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
  updated_at: string;
};

/**
 * Food changed after they said they were done.
 *
 * The cart is shared with the car as it is chosen, so the seat's food is
 * always current; what says whether it still matches what they agreed to is
 * when it last moved against when they finished. A second of slack, because
 * finalising writes both stamps and they are not written in the same
 * instant.
 */
export function changedSinceFinalised(cart: GroupCart): boolean {
  if (!cart.finalised_at) return false;
  return (
    new Date(cart.updated_at).getTime() - new Date(cart.finalised_at).getTime() > 1000
  );
}

/** Ready to travel: their food is settled and we know how to deliver it. */
export function isReady(cart: GroupCart): boolean {
  return cart.finalised_at !== null && canTravel(cart);
}

/**
 * Everything an order needs: food, a number and a block.
 *
 * Not the same as having said "I am done". When the clock runs out, somebody
 * who chose food and gave their details but never pressed finalise has
 * everything needed, and throwing their lunch away over a button they did not
 * press is not a rule worth having.
 */
export function canTravel(cart: GroupCart): boolean {
  return (
    cart.lines.length > 0 &&
    (cart.phone ?? "").trim() !== "" &&
    (cart.hostel ?? "").trim() !== ""
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
export type CartLineView = {
  name: string;
  restaurant: string;
  imageUrl: string;
  choices: string[];
  unitPrice: number;
  qty: number;
};

export async function cartValues(
  carts: GroupCart[]
): Promise<Map<string, { value: number; summary: string; lines: CartLineView[] }>> {
  const out = new Map<string, { value: number; summary: string; lines: CartLineView[] }>();
  if (carts.length === 0) return out;

  const itemIds = [...new Set(carts.flatMap((c) => c.lines.map((l) => l.menu_item_id)))];
  const optionIds = [
    ...new Set(carts.flatMap((c) => c.lines.flatMap((l) => l.option_ids ?? []))),
  ];

  const [{ data: items }, { data: options }] = await Promise.all([
    db()
      .from("menu_items")
      .select("id, name, price_food, image_url, restaurant_id")
      .in("id", itemIds),
    optionIds.length > 0
      ? db().from("item_options").select("id, name, price_delta").in("id", optionIds)
      : Promise.resolve({ data: [] as { id: string; name: string; price_delta: number }[] }),
  ]);

  // The restaurant is part of reading a cart: two things called Refuel from
  // different counters are two different orders to whoever collects them.
  const placeIds = [
    ...new Set((items ?? []).map((i) => i.restaurant_id as string).filter(Boolean)),
  ];
  const { data: places } = placeIds.length
    ? await db().from("restaurants").select("id, name").in("id", placeIds)
    : { data: [] as { id: string; name: string }[] };
  const placeNamed = new Map((places ?? []).map((r) => [r.id as string, r.name as string]));

  const price = new Map((items ?? []).map((i) => [i.id as string, i.price_food as number]));
  const named = new Map((items ?? []).map((i) => [i.id as string, i.name as string]));
  const pictured = new Map(
    (items ?? []).map((i) => [i.id as string, (i.image_url as string) ?? ""])
  );
  const from = new Map(
    (items ?? []).map((i) => [i.id as string, placeNamed.get(i.restaurant_id as string) ?? ""])
  );
  const optionNamed = new Map(
    (options ?? []).map((o) => [o.id as string, o.name as string])
  );
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
      // Enough to read it as a cart, which is what it is. Every price comes
      // from the menu here, exactly as their own cart's does.
      lines: cart.lines.map((line) => ({
        name: named.get(line.menu_item_id) ?? "Something",
        restaurant: from.get(line.menu_item_id) ?? "",
        imageUrl: pictured.get(line.menu_item_id) ?? "",
        choices: (line.option_ids ?? [])
          .map((id) => optionNamed.get(id) ?? "")
          .filter(Boolean),
        unitPrice:
          (price.get(line.menu_item_id) ?? 0) +
          (line.option_ids ?? []).reduce((extra, id) => extra + (delta.get(id) ?? 0), 0),
        qty: line.qty ?? 0,
      })),
    });
  }
  return out;
}

/**
 * Every kitchen a car is drawing on, across all its seats.
 *
 * An offer for one counter is an offer for one trip, so it is the whole car
 * that has to qualify, not one person's half of it.
 */
export async function placesInCarts(carts: GroupCart[]): Promise<string[]> {
  const itemIds = [...new Set(carts.flatMap((cart) => cart.lines.map((l) => l.menu_item_id)))];
  if (itemIds.length === 0) return [];

  const { data } = await db()
    .from("menu_items")
    .select("restaurant_id")
    .in("id", itemIds);
  return [...new Set((data ?? []).map((row) => row.restaurant_id as string).filter(Boolean))];
}

/**
 * What everybody in a car chose, one entry per line.
 *
 * For an offer about a size rather than a dish: a car of large pizzas earns
 * it and a car with one small in it does not, the same rule a single cart
 * gets.
 */
export async function choicesInCarts(carts: GroupCart[]): Promise<string[][]> {
  const lines = carts.flatMap((cart) => cart.lines);
  const optionIds = [...new Set(lines.flatMap((line) => line.option_ids ?? []))];
  if (optionIds.length === 0) return lines.map(() => []);

  const { data } = await db().from("item_options").select("id, name").in("id", optionIds);
  const named = new Map(((data ?? []) as any[]).map((one) => [one.id as string, one.name as string]));

  return lines.map((line) =>
    (line.option_ids ?? []).map((id) => named.get(id) ?? "").filter(Boolean)
  );
}
