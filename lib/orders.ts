import { db } from "./supabase";
import { DELIVERY_FEE, FIRST_ORDER_DISCOUNT } from "./config";
import { getBatch, isOrderable, orderCounts } from "./batches";
import { normalisePhone } from "./phone";
import type { Batch, CartLine, MenuItem, Order, OrderItem } from "./types";

export type PlaceOrderInput = {
  batchId: string;
  name: string;
  phone: string;
  hostel: string;
  lines: CartLine[];
  promoterCode: string | null;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/**
 * The only place an order is priced. The cart posts item ids and quantities;
 * prices, the fee and the discount are all read from the database here, so a
 * tampered cart cannot buy anything cheaply.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That phone number doesn't look right." };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  const hostel = input.hostel.trim();
  if (hostel.length < 1) return { ok: false, error: "Please enter your hostel or block." };

  const lines = input.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) return { ok: false, error: "Your cart is empty." };

  const batch = await getBatch(input.batchId);
  if (!batch) return { ok: false, error: "That batch no longer exists." };
  if (!isOrderable(batch)) {
    return { ok: false, error: "That batch has closed. Pick the next one." };
  }

  const capacityError = await checkCapacity(batch);
  if (capacityError) return { ok: false, error: capacityError };

  const { data: itemRows, error: itemError } = await db()
    .from("menu_items")
    .select("*")
    .in("id", lines.map((l) => l.menu_item_id));
  if (itemError) return { ok: false, error: itemError.message };

  const items = new Map((itemRows ?? []).map((i) => [i.id, i as MenuItem]));
  for (const line of lines) {
    const item = items.get(line.menu_item_id);
    if (!item) return { ok: false, error: "An item in your cart is no longer on the menu." };
    if (!item.available) return { ok: false, error: `${item.name} is unavailable today.` };
  }

  const subtotalFood = lines.reduce(
    (sum, l) => sum + items.get(l.menu_item_id)!.price_food * l.qty,
    0
  );

  const promoterCode = await resolvePromoter(input.promoterCode);
  const existing = await isReturningCustomer(phone);
  // The ₦500 comes off the first order only, and only when a code brought them.
  const discount = !existing && promoterCode ? FIRST_ORDER_DISCOUNT : 0;
  const total = subtotalFood + DELIVERY_FEE - discount;

  const { data: order, error: orderError } = await db()
    .from("orders")
    .insert({
      batch_id: batch.id,
      customer_phone: phone,
      customer_name: name,
      hostel,
      subtotal_food: subtotalFood,
      fee: DELIVERY_FEE,
      discount,
      total,
      promoter_code: promoterCode,
      status: "pending",
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return { ok: false, error: orderError?.message ?? "Could not save that order." };
  }

  const { error: linesError } = await db().from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      menu_item_id: l.menu_item_id,
      qty: l.qty,
      unit_price_at_order: items.get(l.menu_item_id)!.price_food,
    }))
  );
  if (linesError) {
    await db().from("orders").delete().eq("id", order.id);
    return { ok: false, error: linesError.message };
  }

  await bindCustomer({ phone, name, hostel, promoterCode, existing });

  return { ok: true, orderId: order.id as string };
}

async function checkCapacity(batch: Batch): Promise<string | null> {
  if (batch.capacity === null) return null;
  const count = (await orderCounts([batch.id])).get(batch.id) ?? 0;
  return count >= batch.capacity
    ? "That batch is full — the car only holds so many boxes. Pick the next one."
    : null;
}

async function resolvePromoter(code: string | null): Promise<string | null> {
  if (!code) return null;
  const { data } = await db()
    .from("promoters")
    .select("code")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();
  return (data?.code as string) ?? null;
}

/** First-order detection is simply "does this phone exist in customers". */
async function isReturningCustomer(phone: string): Promise<boolean> {
  const { data } = await db()
    .from("customers")
    .select("phone")
    .eq("phone", phone)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Writes the customer row on first order, binding the promoter code to the
 * phone number permanently. On later orders the name and hostel are refreshed
 * but `promoter_code` is deliberately never touched — that is what makes the
 * commission lifetime (brief §13, "Key rule").
 */
async function bindCustomer(args: {
  phone: string;
  name: string;
  hostel: string;
  promoterCode: string | null;
  existing: boolean;
}): Promise<void> {
  if (args.existing) {
    await db()
      .from("customers")
      .update({ name: args.name, hostel: args.hostel })
      .eq("phone", args.phone);
    return;
  }
  await db().from("customers").insert({
    phone: args.phone,
    name: args.name,
    hostel: args.hostel,
    promoter_code: args.promoterCode,
  });
}

export type OrderLine = OrderItem & { name: string; restaurant: string };
export type FullOrder = Order & { batch: Batch; lines: OrderLine[] };

export async function getOrder(id: string): Promise<FullOrder | null> {
  const { data: order } = await db().from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;

  const batch = await getBatch(order.batch_id);
  if (!batch) return null;

  return { ...(order as Order), batch, lines: await linesFor([id]) };
}

/** Order lines with the item and restaurant names joined on. */
export async function linesFor(orderIds: string[]): Promise<OrderLine[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await db()
    .from("order_items")
    .select("*, menu_items(name, restaurants(name))")
    .in("order_id", orderIds);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    menu_item_id: row.menu_item_id,
    qty: row.qty,
    unit_price_at_order: row.unit_price_at_order,
    name: row.menu_items?.name ?? "(removed item)",
    restaurant: row.menu_items?.restaurants?.name ?? "—",
  }));
}

/** The most recent order for a phone number — powers one-tap reorder. */
export async function lastOrderForPhone(phone: string): Promise<FullOrder | null> {
  const { data } = await db()
    .from("orders")
    .select("id")
    .eq("customer_phone", phone)
    .neq("status", "refunded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? getOrder(data.id as string) : null;
}
