import { db } from "./supabase";
import type { CartLine } from "./types";

export type GroupCart = {
  id: string;
  group_id: string;
  phone: string;
  name: string;
  hostel: string;
  lines: CartLine[];
  payment_method: string;
  customer_note: string;
  coupon: string;
  done_at: string | null;
  created_at: string;
};

/**
 * Food put into a shared delivery, held until the group closes.
 *
 * One row per person. Checking out again replaces what they had, because
 * somebody adding a drink they forgot is the same person in the same car, not
 * a second seat in it.
 */
export async function saveGroupCart(cart: {
  groupId: string;
  phone: string;
  name: string;
  hostel: string;
  lines: CartLine[];
  paymentMethod: "transfer" | "card";
  customerNote: string;
  coupon: string;
}): Promise<string | null> {
  const { data, error } = await db()
    .from("group_carts")
    .upsert(
      {
        group_id: cart.groupId,
        phone: cart.phone,
        name: cart.name,
        hostel: cart.hostel,
        lines: cart.lines,
        payment_method: cart.paymentMethod,
        customer_note: cart.customerNote,
        coupon: cart.coupon,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "group_id,phone" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("saveGroupCart failed:", error.message);
    return null;
  }
  return (data?.id as string) ?? null;
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
    .update({ done_at: new Date().toISOString() })
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
export async function cartValues(carts: GroupCart[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (carts.length === 0) return out;

  const itemIds = [...new Set(carts.flatMap((c) => c.lines.map((l) => l.menu_item_id)))];
  const optionIds = [
    ...new Set(carts.flatMap((c) => c.lines.flatMap((l) => l.option_ids ?? []))),
  ];

  const [{ data: items }, { data: options }] = await Promise.all([
    db().from("menu_items").select("id, price_food").in("id", itemIds),
    optionIds.length > 0
      ? db().from("item_options").select("id, price_delta").in("id", optionIds)
      : Promise.resolve({ data: [] as { id: string; price_delta: number }[] }),
  ]);

  const price = new Map((items ?? []).map((i) => [i.id as string, i.price_food as number]));
  const delta = new Map(
    (options ?? []).map((o) => [o.id as string, o.price_delta as number])
  );

  for (const cart of carts) {
    out.set(
      cart.id,
      cart.lines.reduce((sum, line) => {
        const unit =
          (price.get(line.menu_item_id) ?? 0) +
          (line.option_ids ?? []).reduce((extra, id) => extra + (delta.get(id) ?? 0), 0);
        return sum + unit * (line.qty ?? 0);
      }, 0)
    );
  }
  return out;
}
