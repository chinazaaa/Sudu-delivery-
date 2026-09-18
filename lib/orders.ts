import { db } from "./supabase";
import { feeFor, splitFee, type Band } from "./fees";
import { activeBands } from "./settings";
import {
  checkCoupon,
  couponLabel,
  useCoupon,
  type CouponCheck,
} from "./coupons";
import { cartConverted } from "./carts";
import { emailAdmins } from "./email";
import { renderEmail, renderText, type Block } from "./email-html";
import { siteUrl } from "./admin-templates";
import { naira, orderRef } from "./money";
import { SLOT_LABEL } from "./config";
import { runDateLabel, weekdayLabel } from "./time";
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
  /** Present when one person is carting for several (addendum §2). */
  groupMode?: GroupMode | null;
  /** Transfer, or a card link sent by hand over WhatsApp. */
  paymentMethod?: "transfer" | "card";
  /** Whether one person collects every bag, or everyone collects their own. */
  collectMode?: "leader" | "each";
  /** The others in a group order, with their own number and block if given. */
  people?: {
    name: string;
    phone: string;
    hostel: string;
    /** How that person pays their own share, in a split group. */
    pays?: "transfer" | "card";
  }[];
  /** Anything the customer asked for, in their own words. */
  customerNote?: string;
  /** A discount code typed at checkout. */
  coupon?: string;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; groupId?: string }
  | { ok: false; error: string };

type PricedOption = { id: string; name: string; price_delta: number };
type PricedLine = CartLine & {
  item: MenuItem;
  options: PricedOption[];
  /** Base price plus every chosen option, per unit. */
  unitPrice: number;
};

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

  // Delivery is priced from whatever bands the admin has set, read here so a
  // price change takes effect on the next order and not on a redeploy.
  const bands = await activeBands();
  const customerNote = (input.customerNote ?? "").trim();
  const returning = await isReturningCustomer(phone);

  // A discount code is checked against this order's own delivery, so "free
  // delivery" is worth what delivery actually costs here and no more. The
  // check happens against the fee the order is about to be charged.
  const coupon = input.coupon?.trim()
    ? await checkCoupon({
        code: input.coupon,
        fee: feeFor(countItems(priced.lines), batch.flash_fee, bands),
        food: countFood(priced.lines),
        returning,
        batchId: batch.id,
      })
    : null;
  if (coupon && !coupon.ok) return { ok: false, error: coupon.error };

  const paymentMethod = input.paymentMethod ?? "transfer";
  const collectMode = input.collectMode ?? "leader";

  const result =
    input.groupMode === "split"
      ? await placeSplitGroup({
          batch,
          phone,
          name,
          hostel,
          lines: priced.lines,
          coupon: coupon?.ok ? coupon : null,
          paymentMethod,
          collectMode,
          people: input.people ?? [],
          bands,
          customerNote,
        })
      : await placeSingleOrder({
          batch,
          phone,
          name,
          hostel,
          lines: priced.lines,
          coupon: coupon?.ok ? coupon : null,
          groupMode: input.groupMode ?? null,
          paymentMethod,
          collectMode,
          people: input.people ?? [],
          bands,
          customerNote,
        });

  if (!result.ok) return result;

  if (coupon?.ok) await useCoupon(coupon.coupon.code);
  await bindCustomer({ phone, name, hostel, returning });
  // The cart behind this order is no longer abandoned, and the admins are told
  // rather than having to keep refreshing. Neither can fail the order.
  await cartConverted(phone, batch.id).catch(() => {});
  void announceOrder({
    orderId: result.orderId,
    name,
    phone,
    hostel,
    batch,
    items: countItems(priced.lines),
    note: customerNote,
  });
  return result;
}

/**
 * Looks every line up in the database, including the chosen size and flavour.
 * Nothing about price comes from the browser: a large pepperoni costs what the
 * menu says a large pepperoni costs.
 */
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

  const optionIds = [...new Set(wanted.flatMap((l) => l.option_ids ?? []))];
  const options = new Map<string, PricedOption & { available: boolean }>();

  if (optionIds.length > 0) {
    const { data: rows, error: optionError } = await db()
      .from("item_options")
      .select("id, name, price_delta, available")
      .in("id", optionIds);
    if (optionError) return { error: optionError.message };
    for (const row of rows ?? []) options.set(row.id as string, row as any);
  }

  const priced: PricedLine[] = [];

  for (const line of wanted) {
    const item = items.get(line.menu_item_id);
    if (!item) return { error: "An item in your cart is no longer on the menu." };
    if (!item.available) return { error: `${item.name} is unavailable today.` };

    const chosen: PricedOption[] = [];
    for (const id of line.option_ids ?? []) {
      const option = options.get(id);
      if (!option) return { error: `A choice on ${item.name} is no longer offered.` };
      if (!option.available) {
        return { error: `${option.name} is unavailable on ${item.name} today.` };
      }
      chosen.push({ id: option.id, name: option.name, price_delta: option.price_delta });
    }

    priced.push({
      ...line,
      item,
      options: chosen,
      unitPrice:
        item.price_food + chosen.reduce((sum, o) => sum + o.price_delta, 0),
    });
  }
  return { lines: priced };
}

const countItems = (lines: PricedLine[]) => lines.reduce((sum, l) => sum + l.qty, 0);
const countFood = (lines: PricedLine[]) =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

async function placeSingleOrder(args: {
  batch: Batch;
  phone: string;
  name: string;
  hostel: string;
  lines: PricedLine[];
  coupon: Extract<CouponCheck, { ok: true }> | null;
  groupMode: GroupMode | null;
  paymentMethod: "transfer" | "card";
  collectMode: "leader" | "each";
  people: { name: string; phone: string; hostel: string }[];
  bands: Band[];
  customerNote: string;
}): Promise<PlaceOrderResult> {
  // Adding to an existing order is a second order to the same batch, not an
  // edit: the admin view merges by phone into one bag (addendum §3). Only the
  // difference in fee is charged, because it is one load either way.
  const existing = await existingLoad(args.batch.id, args.phone);
  const combined = existing.items + countItems(args.lines);
  const fee = Math.max(
    0,
    feeFor(combined, args.batch.flash_fee, args.bands) - existing.feeCharged
  );

  let group: OrderGroup | null = null;
  if (args.groupMode === "one_payer") {
    group = await createGroup(args, "one_payer", args.collectMode);
    if (!group) return { ok: false, error: "Could not start that group order." };
    await saveMembers(group.id, args.people);
  }

  // An untagged line belongs to whoever is ordering, so it is labelled with
  // their name rather than left blank. This applies whenever any line carries
  // a name at all, not only inside a group: tagging two items in the cart and
  // leaving a third alone used to produce a bag where one item had no owner.
  const tagged = group !== null || args.lines.some((line) => line.for_name?.trim());
  const lines = tagged
    ? args.lines.map((line) => ({
        ...line,
        for_name: line.for_name?.trim() || args.name,
      }))
    : args.lines;

  const order = await insertOrder({
    batch_id: args.batch.id,
    customer_phone: args.phone,
    customer_name: args.name,
    hostel: args.hostel,
    subtotal_food: countFood(lines),
    fee,
    discount: args.coupon?.discount ?? 0,
    coupon_code: args.coupon?.coupon.code ?? null,
    group_id: group?.id ?? null,
    for_name: null,
    payment_method: args.paymentMethod,
    customer_note: args.customerNote,
    lines,
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
  coupon: Extract<CouponCheck, { ok: true }> | null;
  paymentMethod: "transfer" | "card";
  collectMode: "leader" | "each";
  people: {
    name: string;
    phone: string;
    hostel: string;
    pays?: "transfer" | "card";
  }[];
  bands: Band[];
  customerNote: string;
}): Promise<PlaceOrderResult> {
  // The leader's own items are keyed by an empty name, not by what they typed
  // in "Your name". Keying by the name collapsed the whole group into one payer
  // whenever a friend happened to share the leader's name.
  const byPerson = new Map<string, PricedLine[]>();
  for (const line of args.lines) {
    const who = (line.for_name ?? "").trim();
    byPerson.set(who, [...(byPerson.get(who) ?? []), line]);
  }
  if (byPerson.size < 2) {
    return {
      ok: false,
      error:
        "Splitting payment needs two people with food in the cart. " +
        "Go back to the cart and tap a name under each item.",
    };
  }

  const group = await createGroup(args, "split", args.collectMode);
  if (!group) return { ok: false, error: "Could not start that group order." };
  await saveMembers(group.id, args.people);
  // Each of them is about to own an order, so each of them needs a PIN.
  await ensureCustomers(args.people);

  // The band is set by the whole load, then shared out by what each person got.
  const people = [...byPerson.entries()];
  const groupFee = feeFor(countItems(args.lines), args.batch.flash_fee, args.bands);
  const shares = splitFee(groupFee, people.map(([, lines]) => countItems(lines)));

  let leaderOrderId: string | null = null;

  for (const [index, [who, lines]] of people.entries()) {
    const isLeader = who === "";
    // Their own number, when they gave one: it is what their payment link and
    // their transfer narration hang off, and it gives them their own history.
    const theirs = args.people.find((p) => p.name === who);
    const phone = (theirs?.phone && normalisePhone(theirs.phone)) || args.phone;

    const id = await insertOrder({
      batch_id: args.batch.id,
      customer_phone: phone,
      customer_name: args.name,
      hostel: theirs?.hostel?.trim() || args.hostel,
      subtotal_food: countFood(lines),
      fee: shares[index],
      // A discount lands once, on the share the person who typed the code is
      // paying for.
      discount: isLeader ? args.coupon?.discount ?? 0 : 0,
      coupon_code: isLeader ? args.coupon?.coupon.code ?? null : null,
      group_id: group.id,
      // The leader's share carries their own name on the bag label.
      for_name: isLeader ? args.name : who,
      // Everyone pays their own share their own way: one friend can send a
      // transfer while another waits for a card link.
      payment_method: isLeader ? args.paymentMethod : theirs?.pays ?? args.paymentMethod,
      // The note belongs to whoever wrote it, not to everyone in the group.
      customer_note: isLeader ? args.customerNote : "",
      lines,
    });
    if (!id) return { ok: false, error: "Could not save that group order." };
    if (isLeader || leaderOrderId === null) leaderOrderId = id;
  }

  return { ok: true, orderId: leaderOrderId!, groupId: group.id };
}

async function createGroup(
  args: { batch: Batch; phone: string; name: string; hostel: string },
  mode: GroupMode,
  collectMode: "leader" | "each"
): Promise<OrderGroup | null> {
  const { data } = await db()
    .from("order_groups")
    .insert({
      batch_id: args.batch.id,
      leader_phone: args.phone,
      leader_name: args.name,
      hostel: args.hostel,
      mode,
      collect_mode: collectMode,
    })
    .select("*")
    .single();
  return (data as OrderGroup) ?? null;
}

/**
 * Keeps the name, number and block of everyone in a group. The bag labels come
 * from the order lines; this is how anyone can be phoned when the food lands.
 */
/**
 * A PIN for everybody who ends up holding an order of their own.
 *
 * In a split group each friend gets their own order under their own number,
 * and without a customer row they have no PIN, so they cannot open the order
 * they are being asked to pay for. Their name and block are written only when
 * there is nothing there already: somebody who has ordered before keeps their
 * own details, and their promoter stays theirs for life.
 */
async function ensureCustomers(
  people: { name: string; phone: string; hostel: string }[]
): Promise<void> {
  const rows = people
    .map((person) => ({
      phone: normalisePhone(person.phone),
      name: person.name.trim(),
      hostel: person.hostel.trim(),
    }))
    .filter((person): person is { phone: string; name: string; hostel: string } =>
      Boolean(person.phone)
    );
  if (rows.length === 0) return;

  const seen = new Map<string, { phone: string; name: string; hostel: string }>();
  for (const row of rows) if (!seen.has(row.phone)) seen.set(row.phone, row);

  try {
    const { data: known } = await db()
      .from("customers")
      .select("phone")
      .in("phone", [...seen.keys()]);
    for (const row of (known ?? []) as { phone: string }[]) seen.delete(row.phone);
    if (seen.size === 0) return;

    await db()
      .from("customers")
      .insert(
        [...seen.values()].map((person) => ({
          phone: person.phone,
          name: person.name || "Friend",
          hostel: person.hostel,
          pin: newPin(),
        }))
      );
  } catch {
    // Their order exists either way. A missing PIN is a smaller problem than
    // an order that would not save.
  }
}

async function saveMembers(
  groupId: string,
  people: { name: string; phone: string; hostel: string }[]
): Promise<void> {
  const rows = people
    .filter((person) => person.name.trim().length > 0)
    .map((person) => ({
      group_id: groupId,
      name: person.name.trim(),
      phone: normalisePhone(person.phone) ?? person.phone.trim(),
      hostel: person.hostel.trim(),
    }));
  if (rows.length === 0) return;
  await db().from("group_members").insert(rows);
}

export async function membersOf(groupId: string | null): Promise<GroupMember[]> {
  if (!groupId) return [];
  const { data } = await db()
    .from("group_members")
    .select("id, name, phone, hostel")
    .eq("group_id", groupId)
    .order("name");
  return (data ?? []) as GroupMember[];
}

async function insertOrder(args: {
  batch_id: string;
  customer_phone: string;
  customer_name: string;
  hostel: string;
  subtotal_food: number;
  fee: number;
  discount: number;
  coupon_code: string | null;
  group_id: string | null;
  for_name: string | null;
  payment_method: "transfer" | "card";
  customer_note: string;
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
      coupon_code: args.coupon_code,
      group_id: args.group_id,
      for_name: args.for_name,
      payment_method: args.payment_method,
      customer_note: args.customer_note,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !order) return null;

  const { data: savedLines, error: linesError } = await db()
    .from("order_items")
    .insert(
      args.lines.map((l) => ({
        order_id: order.id,
        menu_item_id: l.menu_item_id,
        qty: l.qty,
        unit_price_at_order: l.unitPrice,
        for_name: l.for_name ?? args.for_name ?? null,
      }))
    )
    .select("id");
  if (linesError || !savedLines) {
    await db().from("orders").delete().eq("id", order.id);
    return null;
  }

  // The chosen size and flavour are copied at order time like the price, so
  // editing the menu later never rewrites what was actually bought.
  const chosen = savedLines.flatMap((row, index) =>
    args.lines[index].options.map((option) => ({
      order_item_id: row.id,
      option_id: option.id,
      name_at_order: option.name,
      price_delta_at_order: option.price_delta,
    }))
  );
  if (chosen.length > 0) {
    const { error: optionError } = await db().from("order_item_options").insert(chosen);
    if (optionError) {
      await db().from("orders").delete().eq("id", order.id);
      return null;
    }
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

/**
 * Tells whoever runs the shop that an order has landed. Deliberately not
 * awaited by the caller: an email provider having a bad minute must not slow
 * down or fail a checkout.
 */
async function announceOrder(args: {
  orderId: string;
  name: string;
  phone: string;
  hostel: string;
  batch: Batch;
  items: number;
  note: string;
}): Promise<void> {
  try {
    const order = await getOrder(args.orderId);
    const label = `${runDateLabel(args.batch.run_date)} · ${SLOT_LABEL[args.batch.slot]}`;

    // Straight to the order, because the point of the email is to go and do
    // something about it: send the message, paste the card link, mark it paid.
    const url = await siteUrl().catch(() => "");
    const link = url ? `${url}/admin/orders/${args.orderId}` : "";

    // Card is the one that needs something doing by hand: the link goes out
    // on WhatsApp. It belongs in the subject, where it is read first.
    const byCard = order?.payment_method === "card";

    const title =
      `New order ${order ? orderRef(order) : ""} · ${args.name} · ` +
      `${naira(order?.total ?? 0)}${byCard ? " · card link" : ""}`;

    // Grouped by restaurant, because the next thing that happens is somebody
    // ordering it from each one, counter by counter.
    const byPlace = new Map<string, string[]>();
    for (const line of order?.lines ?? []) {
      const place = line.restaurant || "Unknown";
      const choices = line.choices.length > 0 ? ` (${line.choices.join(", ")})` : "";
      byPlace.set(place, [...(byPlace.get(place) ?? []), `${line.qty} × ${line.name}${choices}`]);
    }

    const blocks: Block[] = [
      { kind: "text", text: `${args.name} just ordered for the ${label} run.` },
      ...(link ? [{ kind: "button" as const, label: "Open the order", href: link }] : []),
      {
        kind: "rows",
        rows: [
          { label: "Total", value: `${naira(order?.total ?? 0)} · unpaid` },
          // The total is what lands in the bank, so a discount has to be said
          // out loud or the number looks short.
          ...(order && order.discount > 0
            ? [
                {
                  label: "Discount",
                  value:
                    `−${naira(order.discount)}` +
                    (order.coupon_code ? ` · ${order.coupon_code}` : ""),
                },
              ]
            : []),
          {
            label: "Paying by",
            value: byCard ? "Card, link not sent yet" : "Bank transfer",
          },
          { label: "Number", value: args.phone },
          { label: "Block", value: args.hostel },
          { label: "Items", value: String(args.items) },
        ],
      },
      ...[...byPlace.entries()].map(([place, items]) => ({
        kind: "list" as const,
        title: place,
        items,
      })),
      ...(byCard
        ? [
            {
              kind: "note" as const,
              text:
                "They chose to pay by card, so send them the payment link on " +
                "WhatsApp. The order stays unpaid until you mark it paid.",
            },
          ]
        : []),
      ...(args.note ? [{ kind: "note" as const, text: `They asked: ${args.note}` }] : []),
    ];

    await emailAdmins(title, renderText(title, blocks), renderEmail(title, blocks));
  } catch {
    /* Never let a notification break an order that is already saved. */
  }
}

/**
 * Checks a code against a cart before the order is placed, so somebody can
 * see what it is worth rather than typing it and hoping. It prices the cart
 * the same way placing it does, because a code's worth depends on the
 * delivery being charged.
 */
export async function previewCoupon(args: {
  code: string;
  batchId: string;
  lines: CartLine[];
  phone: string;
}): Promise<{ ok: true; discount: number; label: string } | { ok: false; error: string }> {
  const batch = await getBatch(args.batchId);
  if (!batch) return { ok: false, error: "Pick a run first." };

  const priced = await priceLines(args.lines);
  if ("error" in priced) return { ok: false, error: priced.error };

  const phone = normalisePhone(args.phone);
  const result = await checkCoupon({
    code: args.code,
    fee: feeFor(countItems(priced.lines), batch.flash_fee, await activeBands()),
    food: countFood(priced.lines),
    returning: phone ? await isReturningCustomer(phone) : false,
    batchId: batch.id,
  });

  return result.ok
    ? { ok: true, discount: result.discount, label: couponLabel(result.coupon) }
    : { ok: false, error: result.error };
}

export type MoveResult = { ok: true; orderId: string } | { ok: false; error: string };

/**
 * Moves an order onto another run, keeping its number and its items.
 *
 * An unpaid order is repriced against today's menu and the new run's fee band,
 * because a week-old price is not a promise anybody made. A paid one is not:
 * the money is settled, so changing one's mind from Friday afternoon to Friday
 * night must not produce a bill or a refund. That only holds while the run it
 * is on is still open; once it has closed, that run has been shopped for.
 *
 * A split group moves together, since half a group on another night is
 * nobody's idea of a group order.
 */
export async function moveOrder(orderId: string, batchId: string): Promise<MoveResult> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, error: "That order no longer exists." };
  if (order.status === "refunded") {
    return { ok: false, error: "That order was refunded, so there is nothing to move." };
  }

  const paid = order.status !== "pending";
  if (paid && !isOrderable(order.batch)) {
    return {
      ok: false,
      error:
        "That run has closed and the food has been bought, so this one cannot move. " +
        "Message us and we will sort it out.",
    };
  }

  const batch = await getBatch(batchId);
  if (!batch || !isOrderable(batch)) {
    return { ok: false, error: "That run is not taking orders. Pick another." };
  }

  const capacity = await checkCapacity(batch);
  if (capacity) return { ok: false, error: capacity };

  // The whole group travels together, or none of it does.
  const moving =
    order.group_id && order.shares.length > 1
      ? order.shares
          .filter((share) => share.status !== "refunded")
          .map((share) => share.id)
      : [orderId];

  const bands = await activeBands();

  for (const id of moving) {
    const one = await getOrder(id);
    if (!one) continue;

    // A paid order carries its money across untouched: nothing is re-charged
    // and nothing is refunded for changing which night it comes on.
    if (one.status !== "pending") {
      await db().from("orders").update({ batch_id: batch.id }).eq("id", id);
      continue;
    }

    // Today's prices, today's availability, choices included.
    const repriced = await repeatLines(one);
    if (repriced.blocked.length > 0) {
      const names = repriced.blocked.map((item) => `${item.name} is ${item.reason}`);
      return { ok: false, error: `${names.join(", ")}. Take it off the order first.` };
    }

    const food = repriced.lines.reduce(
      (total, line) => total + line.unitPrice * line.qty,
      0
    );
    const items = repriced.lines.reduce((count, line) => count + line.qty, 0);

    // Whatever that person already has on the new run decides the top-up.
    const existing = await existingLoad(batch.id, one.customer_phone);
    const fee = Math.max(
      0,
      feeFor(existing.items + items, batch.flash_fee, bands) - existing.feeCharged
    );

    // The lines carry the new prices too, so the order reads as it is charged.
    for (const line of one.lines) {
      const match = repriced.lines.find((row) => row.itemId === line.menu_item_id);
      if (match && match.unitPrice !== line.unit_price_at_order) {
        await db()
          .from("order_items")
          .update({ unit_price_at_order: match.unitPrice })
          .eq("id", line.id);
      }
    }

    await db()
      .from("orders")
      .update({
        batch_id: batch.id,
        subtotal_food: food,
        fee,
        total: Math.max(0, food + fee - one.discount),
      })
      .eq("id", id);
  }

  return { ok: true, orderId };
}

export type RepeatBlock = {
  name: string;
  /** Why it cannot go back in the cart, in the customer's words. */
  reason: "sold out today" | "no longer on the menu";
};

export type RepeatResult = {
  lines: RepeatLine[];
  blocked: RepeatBlock[];
};

export type RepeatLine = {
  itemId: string;
  optionIds: string[];
  name: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string;
  unitPrice: number;
  choices: string[];
  qty: number;
  forName: string;
};

/**
 * An old order rebuilt as cart lines at today's prices. Anything taken off the
 * menu, or sold out, is left out rather than quietly repeated: a cart that
 * cannot be bought is worse than a shorter one.
 */
export async function repeatLines(order: FullOrder): Promise<RepeatResult> {
  const itemIds = [...new Set(order.lines.map((line) => line.menu_item_id))];
  if (itemIds.length === 0) return { lines: [], blocked: [] };

  // Read without a join: an embedded select that PostgREST cannot resolve
  // returns nothing, which silently emptied the whole repeat.
  const { data: items, error } = await db()
    .from("menu_items")
    .select("id, name, price_food, image_url, available, restaurant_id")
    .in("id", itemIds);
  if (error) throw new Error(error.message);

  const rows = (items ?? []) as (MenuItem & { restaurant_id: string })[];
  const byItem = new Map(rows.map((row) => [row.id, row]));

  const { data: restaurants } = await db()
    .from("restaurants")
    .select("id, name")
    .in("id", [...new Set(rows.map((row) => row.restaurant_id))]);
  const byRestaurant = new Map(
    (restaurants ?? []).map((row) => [row.id as string, row.name as string])
  );

  // The options are read back by id so a size that has since changed price is
  // repeated at what it costs now.
  const { data: chosen } = await db()
    .from("order_item_options")
    .select("order_item_id, option_id")
    .in("order_item_id", order.lines.map((line) => line.id));

  const optionIds = [
    ...new Set(
      (chosen ?? [])
        .map((row) => row.option_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const { data: options } = optionIds.length
    ? await db()
        .from("item_options")
        .select("id, name, price_delta, available")
        .in("id", optionIds)
    : { data: [] };
  const byOption = new Map((options ?? []).map((row: any) => [row.id as string, row]));

  const repeats: RepeatLine[] = [];
  const blocked: RepeatBlock[] = [];

  for (const line of order.lines) {
    const item = byItem.get(line.menu_item_id);
    if (!item) {
      blocked.push({ name: line.name, reason: "no longer on the menu" });
      continue;
    }
    if (item.available === false) {
      blocked.push({ name: item.name, reason: "sold out today" });
      continue;
    }

    const chosenHere = (chosen ?? [])
      .filter((row) => row.order_item_id === line.id)
      .map((row) => byOption.get(row.option_id as string))
      .filter((option) => option && option.available !== false);

    repeats.push({
      itemId: item.id,
      optionIds: chosenHere.map((option: any) => option.id as string),
      name: item.name,
      restaurantId: item.restaurant_id,
      restaurantName: byRestaurant.get(item.restaurant_id) ?? "",
      imageUrl: item.image_url ?? "",
      unitPrice:
        item.price_food +
        chosenHere.reduce(
          (sum: number, option: any) => sum + (option.price_delta as number),
          0
        ),
      choices: chosenHere.map((option: any) => option.name as string),
      qty: line.qty,
      forName: "",
    });
  }
  return { lines: repeats, blocked };
}

export type FeeStory = {
  /** Containers on this order alone. */
  items: number;
  /** Containers on that person's other orders in the same run. */
  otherItems: number;
  /** Delivery already charged on those other orders. */
  otherFee: number;
  /** What the whole load costs to carry. */
  wholeFee: number;
  /** Delivery charged on this order: the difference, when adding. */
  fee: number;
  /** A flash drop was on when this was priced. */
  flashFee: number | null;
};

/**
 * Why this order's delivery is what it is. Adding to an order already in a
 * run charges only the difference, because it is one load either way, which
 * makes a small number on a big order look wrong without the explanation.
 */
export async function feeStory(order: FullOrder): Promise<FeeStory> {
  const load = await existingLoad(order.batch_id, order.customer_phone);
  const items = order.lines.reduce((count, line) => count + line.qty, 0);

  return {
    items,
    otherItems: Math.max(0, load.items - items),
    otherFee: Math.max(0, load.feeCharged - order.fee),
    wholeFee: load.feeCharged,
    fee: order.fee,
    flashFee: order.batch.flash_fee,
  };
}

async function checkCapacity(batch: Batch): Promise<string | null> {
  if (batch.capacity === null) return null;
  const count = (await orderCounts([batch.id])).get(batch.id) ?? 0;
  return count >= batch.capacity
    ? "That batch is full. The car only holds so many boxes, so pick the next one."
    : null;
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
    pin: newPin(),
  });
}

export type OrderLine = OrderItem & {
  name: string;
  restaurant: string;
  /** "Large", "Pepperoni". What she reads out at the counter. */
  choices: string[];
};
export type GroupShare = {
  id: string;
  order_no: number | null;
  for_name: string | null;
  total: number;
  status: Order["status"];
  customer_name: string;
  customer_phone: string;
  hostel: string;
  /** That person's own food, so the page can itemise who has what. */
  lines: OrderLine[];
};
export type GroupMember = {
  id: string;
  name: string;
  phone: string;
  hostel: string;
};
export type FullOrder = Order & {
  batch: Batch;
  lines: OrderLine[];
  group: OrderGroup | null;
  shares: GroupShare[];
  /** Everyone named in the group, with a number to call. */
  members: GroupMember[];
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
    members: await membersOf(order.group_id),
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
    .select(
      "id, order_no, for_name, total, status, customer_name, customer_phone, hostel"
    )
    .eq("group_id", groupId)
    .order("order_no");

  const rows = (data ?? []) as Omit<GroupShare, "lines">[];
  const lines = await linesFor(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    lines: lines.filter((line) => line.order_id === row.id),
  }));
}

/** Order lines with the item and restaurant names joined on. */
export async function linesFor(orderIds: string[]): Promise<OrderLine[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await db()
    .from("order_items")
    .select("*, menu_items(name, restaurants(name)), order_item_options(name_at_order)")
    .in("order_id", orderIds);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    choices: (row.order_item_options ?? []).map((o: any) => o.name_at_order),
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
