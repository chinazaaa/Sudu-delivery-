import { db } from "./supabase";
import { FIRST_ORDER_DISCOUNT } from "./config";
import { feeFor, splitFee } from "./fees";
import { getBatch, isOrderable, orderCounts } from "./batches";
import { normalisePhone } from "./phone";
import { newPin } from "./customer-auth";
import type {
  Batch,
  CartLine,
  GroupMode,
  MenuItem,
  Order,
  OrderItem,
  OrderGroup,
} from "./types";

export type PlaceOrderInput = {
  batchId: string;
  name: string;
  phone: string;
  hostel: string;
  lines: CartLine[];
  promoterCode: string | null;
  /** Present when one person is carting for several (addendum §2). */
  groupMode?: GroupMode | null;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; groupId?: string }
  | { ok: false; error: string };

type PricedLine = CartLine & { item: MenuItem };

/**
 * The only place an order is priced. The cart posts item ids and quantities;
 * prices, the fee band and the discount are all read from the database here,
 * so a tampered cart cannot buy anything cheaply.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That phone number doesn't look right." };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  const hostel = input.hostel.trim();
  if (hostel.length < 1) return { ok: false, error: "Please enter your hostel or block." };

  const batch = await getBatch(input.batchId);
  if (!batch) return { ok: false, error: "That batch no longer exists." };
  if (!isOrderable(batch)) {
    return { ok: false, error: "That batch has closed. Pick the next one." };
  }

  const capacityError = await checkCapacity(batch);
  if (capacityError) return { ok: false, error: capacityError };

  const priced = await priceLines(input.lines);
  if ("error" in priced) return { ok: false, error: priced.error };

  const promoterCode = await resolvePromoter(input.promoterCode);
  const returning = await isReturningCustomer(phone);
  const discount = !returning && promoterCode ? FIRST_ORDER_DISCOUNT : 0;

  const result =
    input.groupMode === "split"
      ? await placeSplitGroup({ batch, phone, name, hostel, lines: priced.lines, promoterCode, discount })
      : await placeSingleOrder({
          batch,
          phone,
          name,
          hostel,
          lines: priced.lines,
          promoterCode,
          discount,
          groupMode: input.groupMode ?? null,
        });

  if (!result.ok) return result;

  await bindCustomer({ phone, name, hostel, promoterCode, returning });
  return result;
}

/** Looks every line up in the database; nothing about price comes from the browser. */
async function priceLines(
  lines: CartLine[]
): Promise<{ lines: PricedLine[] } | { error: string }> {
  const wanted = lines.filter((l) => l.qty > 0);
  if (wanted.length === 0) return { error: "Your cart is empty." };

  const { data, error } = await db()
    .from("menu_items")
    .select("*")
    .in("id", wanted.map((l) => l.menu_item_id));
  if (error) return { error: error.message };

  const items = new Map((data ?? []).map((i) => [i.id, i as MenuItem]));
  const priced: PricedLine[] = [];

  for (const line of wanted) {
    const item = items.get(line.menu_item_id);
    if (!item) return { error: "An item in your cart is no longer on the menu." };
    if (!item.available) return { error: `${item.name} is unavailable today.` };
    priced.push({ ...line, item });
  }
  return { lines: priced };
}

const countItems = (lines: PricedLine[]) => lines.reduce((sum, l) => sum + l.qty, 0);
const countFood = (lines: PricedLine[]) =>
  lines.reduce((sum, l) => sum + l.item.price_food * l.qty, 0);

async function placeSingleOrder(args: {
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
  lines: PricedLine[];
  promoterCode: string | null;
  discount: number;
  groupMode: GroupMode | null;
}): Promise<PlaceOrderResult> {
  // Adding to an existing order is a second order to the same batch, not an
  // edit: the admin view merges by phone into one bag (addendum §3). Only the
  // difference in fee is charged, because it is one load either way.
  const existing = await existingLoad(args.batch.id, args.phone);
  const combined = existing.items + countItems(args.lines);
  const fee = Math.max(
    0,
    feeFor(combined, args.batch.flash_fee) - existing.feeCharged
  );

  let group: OrderGroup | null = null;
  if (args.groupMode === "one_payer") {
    group = await createGroup(args, "one_payer");
    if (!group) return { ok: false, error: "Could not start that group order." };
  }

  const order = await insertOrder({
    batch_id: args.batch.id,
    customer_phone: args.phone,
    customer_name: args.name,
    hostel: args.hostel,
    subtotal_food: countFood(args.lines),
    fee,
    discount: args.discount,
    promoter_code: args.promoterCode,
    group_id: group?.id ?? null,
    for_name: null,
    lines: args.lines,
  });

  return order
    ? { ok: true, orderId: order, groupId: group?.id }
    : { ok: false, error: "Could not save that order." };
}

/**
 * Split links: one order per named person, all in one group. Keeping them as
 * separate orders is what lets an unpaid share simply not travel, keeping every
 * order wholly paid or wholly unpaid, with no half-paid line items.
 */
async function placeSplitGroup(args: {
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
  lines: PricedLine[];
  promoterCode: string | null;
  discount: number;
}): Promise<PlaceOrderResult> {
  const byPerson = new Map<string, PricedLine[]>();
  for (const line of args.lines) {
    const who = (line.for_name ?? "").trim() || args.name;
    byPerson.set(who, [...(byPerson.get(who) ?? []), line]);
  }
  if (byPerson.size < 2) {
    return { ok: false, error: "Tag items with at least two names to split payment." };
  }

  const group = await createGroup(args, "split");
  if (!group) return { ok: false, error: "Could not start that group order." };

  // The band is set by the whole load, then shared out by what each person got.
  const people = [...byPerson.entries()];
  const groupFee = feeFor(countItems(args.lines), args.batch.flash_fee);
  const shares = splitFee(groupFee, people.map(([, lines]) => countItems(lines)));

  let leaderOrderId: string | null = null;

  for (const [index, [who, lines]] of people.entries()) {
    const isLeader = who === args.name;
    const id = await insertOrder({
      batch_id: args.batch.id,
      customer_phone: args.phone,
      customer_name: args.name,
      hostel: args.hostel,
      subtotal_food: countFood(lines),
      fee: shares[index],
      // The promoter discount belongs to the customer, so it lands once, on
      // the share the person who ordered is paying for.
      discount: isLeader ? args.discount : 0,
      promoter_code: args.promoterCode,
      group_id: group.id,
      for_name: who,
      lines,
    });
    if (!id) return { ok: false, error: "Could not save that group order." };
    if (isLeader || leaderOrderId === null) leaderOrderId = id;
  }

  return { ok: true, orderId: leaderOrderId!, groupId: group.id };
}

async function createGroup(
  args: { batch: Batch; phone: string; name: string; hostel: string },
  mode: GroupMode
): Promise<OrderGroup | null> {
  const { data } = await db()
    .from("order_groups")
    .insert({
      batch_id: args.batch.id,
      leader_phone: args.phone,
      leader_name: args.name,
      hostel: args.hostel,
      mode,
    })
    .select("*")
    .single();
  return (data as OrderGroup) ?? null;
}

async function insertOrder(args: {
  batch_id: string;
  customer_phone: string;
  customer_name: string;
  hostel: string;
  subtotal_food: number;
  fee: number;
  discount: number;
  promoter_code: string | null;
  group_id: string | null;
  for_name: string | null;
  lines: PricedLine[];
}): Promise<string | null> {
  const total = Math.max(0, args.subtotal_food + args.fee - args.discount);

  const { data: order, error } = await db()
    .from("orders")
    .insert({
      batch_id: args.batch_id,
      customer_phone: args.customer_phone,
      customer_name: args.customer_name,
      hostel: args.hostel,
      subtotal_food: args.subtotal_food,
      fee: args.fee,
      discount: args.discount,
      total,
      promoter_code: args.promoter_code,
      group_id: args.group_id,
      for_name: args.for_name,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !order) return null;

  const { error: linesError } = await db().from("order_items").insert(
    args.lines.map((l) => ({
      order_id: order.id,
      menu_item_id: l.menu_item_id,
      qty: l.qty,
      unit_price_at_order: l.item.price_food,
      for_name: l.for_name ?? args.for_name ?? null,
    }))
  );
  if (linesError) {
    await db().from("orders").delete().eq("id", order.id);
    return null;
  }
  return order.id as string;
}

/** What this phone already has in this batch: containers, and fee charged. */
export async function existingLoad(
  batchId: string,
  phone: string
): Promise<{ items: number; feeCharged: number; orders: Order[] }> {
  const { data } = await db()
    .from("orders")
    .select("*")
    .eq("batch_id", batchId)
    .eq("customer_phone", phone)
    .neq("status", "refunded");

  const orders = (data ?? []) as Order[];
  if (orders.length === 0) return { items: 0, feeCharged: 0, orders };

  const { data: items } = await db()
    .from("order_items")
    .select("order_id, qty")
    .in("order_id", orders.map((o) => o.id));

  return {
    items: (items ?? []).reduce((sum, row) => sum + (row.qty as number), 0),
    feeCharged: orders.reduce((sum, o) => sum + o.fee, 0),
    orders,
  };
}

async function checkCapacity(batch: Batch): Promise<string | null> {
  if (batch.capacity === null) return null;
  const count = (await orderCounts([batch.id])).get(batch.id) ?? 0;
  return count >= batch.capacity
    ? "That batch is full. The car only holds so many boxes, so pick the next one."
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
 * but `promoter_code` is deliberately never touched. That is what makes the
 * commission lifetime (brief §13, "Key rule").
 */
async function bindCustomer(args: {
  phone: string;
  name: string;
  hostel: string;
  promoterCode: string | null;
  returning: boolean;
}): Promise<void> {
  if (args.returning) {
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
    pin: newPin(),
  });
}

export type OrderLine = OrderItem & { name: string; restaurant: string };
export type GroupShare = {
  id: string;
  for_name: string | null;
  total: number;
  status: Order["status"];
};
export type FullOrder = Order & {
  batch: Batch;
  lines: OrderLine[];
  group: OrderGroup | null;
  shares: GroupShare[];
};

export async function getOrder(id: string): Promise<FullOrder | null> {
  const { data: order } = await db().from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) return null;

  const batch = await getBatch(order.batch_id);
  if (!batch) return null;

  return {
    ...(order as Order),
    batch,
    lines: await linesFor([id]),
    group: await getGroup(order.group_id),
    shares: await sharesFor(order.group_id),
  };
}

async function getGroup(id: string | null): Promise<OrderGroup | null> {
  if (!id) return null;
  const { data } = await db().from("order_groups").select("*").eq("id", id).maybeSingle();
  return (data as OrderGroup) ?? null;
}

/** Every share of a group, so the leader can see who has not paid. */
export async function sharesFor(groupId: string | null): Promise<GroupShare[]> {
  if (!groupId) return [];
  const { data } = await db()
    .from("orders")
    .select("id, for_name, total, status")
    .eq("group_id", groupId)
    .order("for_name");
  return (data ?? []) as GroupShare[];
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
    for_name: row.for_name,
    name: row.menu_items?.name ?? "(removed item)",
    restaurant: row.menu_items?.restaurants?.name ?? "Unknown",
  }));
}

/** The most recent order for a phone number. Powers one-tap reorder. */
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

/** An open batch this phone already has an order in, for "add to my order". */
export async function openOrderForPhone(
  phone: string
): Promise<{ batch: Batch; items: number } | null> {
  const { data } = await db()
    .from("orders")
    .select("batch_id, batches!inner(status, cut_off_at)")
    .eq("customer_phone", phone)
    .neq("status", "refunded")
    .eq("batches.status", "open")
    .gt("batches.cut_off_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  const batch = await getBatch(data.batch_id as string);
  if (!batch) return null;

  const load = await existingLoad(batch.id, phone);
  return { batch, items: load.items };
}

/** Every order this phone has placed, newest first, for the history page. */
export async function ordersForPhone(phone: string): Promise<FullOrder[]> {
  const { data } = await db()
    .from("orders")
    .select("id")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = await Promise.all(
    (data ?? []).map((row) => getOrder(row.id as string))
  );
  return orders.filter((order): order is FullOrder => order !== null);
}
