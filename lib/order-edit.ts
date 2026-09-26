import { db } from "./supabase";

/**
 * Changing what is in an order after it has been placed.
 *
 * A collection is deliberately high level: "a cake", "a flower". What it
 * actually turns out to be is agreed on WhatsApp afterwards, and then the
 * order has to say the agreed thing. Otherwise somebody reads "flower" off
 * the order on the morning of the run and delivers a flower to a person who
 * asked for a card a week ago.
 *
 * So the order is the record, not the box it came from. Editing it here
 * changes this one order and never the collection everybody else buys.
 *
 * Every change ends in a retotal, because a price that does not follow what
 * is in the order is worse than no price at all.
 */

export type EditedLine = {
  id: string;
  menu_item_id: string;
  qty: number;
  unit_price_at_order: number;
  name: string;
  source: string;
  options: { id: string; name: string; delta: number }[];
};

/** Everything in one order, as the editor needs it. */
export async function linesToEdit(orderId: string): Promise<EditedLine[]> {
  const { data, error } = await db()
    .from("order_items")
    .select(
      "id, menu_item_id, qty, unit_price_at_order, menu_items(name, source), order_item_options(id, name_at_order, price_delta_at_order)"
    )
    .eq("order_id", orderId);
  if (error) return [];

  return (data ?? []).map((row: Record<string, any>) => ({
    id: row.id as string,
    menu_item_id: row.menu_item_id as string,
    qty: Number(row.qty ?? 1),
    unit_price_at_order: Number(row.unit_price_at_order ?? 0),
    name: row.menu_items?.name ?? "(removed item)",
    source: row.menu_items?.source ?? "",
    options: (row.order_item_options ?? []).map((one: Record<string, any>) => ({
      id: one.id as string,
      name: (one.name_at_order as string) ?? "",
      delta: Number(one.price_delta_at_order ?? 0),
    })),
  }));
}

/**
 * Add the order up again and write the new total.
 *
 * The fee is whatever the order already carries: a box's delivery is fixed
 * at the point of ordering and changing the cake inside it does not change
 * what the car costs. The discount stays as it was for the same reason.
 */
export async function retotal(orderId: string): Promise<void> {
  const lines = await linesToEdit(orderId);
  const food = lines.reduce(
    (sum, line) =>
      sum +
      line.qty *
        (line.unit_price_at_order +
          line.options.reduce((extra, one) => extra + one.delta, 0)),
    0
  );

  const { data } = await db()
    .from("orders")
    .select("fee, discount")
    .eq("id", orderId)
    .maybeSingle();

  const fee = Number((data as { fee?: number } | null)?.fee ?? 0);
  const discount = Number((data as { discount?: number } | null)?.discount ?? 0);

  await db()
    .from("orders")
    .update({
      subtotal_food: food,
      // Never below nothing, whatever a discount and a shrinking order do
      // between them.
      total: Math.max(0, food + fee - discount),
    })
    .eq("id", orderId);
}

/** Which order a line belongs to, so an edit can retotal the right one. */
export async function orderOfLine(lineId: string): Promise<string> {
  const { data } = await db()
    .from("order_items")
    .select("order_id")
    .eq("id", lineId)
    .maybeSingle();
  return ((data as { order_id?: string } | null)?.order_id ?? "") as string;
}

/** Which order an option sits under, through its line. */
export async function orderOfOption(optionRowId: string): Promise<string> {
  const { data } = await db()
    .from("order_item_options")
    .select("order_item_id")
    .eq("id", optionRowId)
    .maybeSingle();
  const lineId = ((data as { order_item_id?: string } | null)?.order_item_id ??
    "") as string;
  return lineId === "" ? "" : orderOfLine(lineId);
}

/**
 * Say that this order's price is not settled.
 *
 * Set at checkout when somebody asks for a change, because the moment they
 * ask is the moment the number on the page stops being true. Cleared in
 * admin once what it comes to has been agreed.
 */
export async function markCustomPending(orderId: string): Promise<void> {
  try {
    await db().from("orders").update({ custom_pending: true }).eq("id", orderId);
  } catch {
    /* A shop without the column yet simply has no provisional orders. */
  }
}

/**
 * Everybody who asked for something again.
 *
 * Not a subscription: nothing charges itself, and nothing should. It is a
 * list of people who said "send this every month", and the shop's job is to
 * notice when it is time and raise the next one.
 *
 * Newest first, and the ones already raised again are still here: somebody
 * who has had four care packages is the most valuable person on the list,
 * not somebody to hide.
 */
export type Repeating = {
  id: string;
  ref: string;
  name: string;
  phone: string;
  hostel: string;
  every: string;
  note: string;
  total: number;
  status: string;
  placedOn: string;
  wantedOn: string | null;
};

export async function repeatingOrders(): Promise<Repeating[]> {
  const { data, error } = await db()
    .from("orders")
    .select(
      "id, order_no, customer_name, customer_phone, hostel, repeat_every, repeat_note, total, status, created_at, wanted_on"
    )
    .neq("repeat_every", "")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    ref: row.order_no ? `#${row.order_no}` : String(row.id ?? "").slice(0, 6),
    name: String(row.customer_name ?? ""),
    phone: String(row.customer_phone ?? ""),
    hostel: String(row.hostel ?? ""),
    every: String(row.repeat_every ?? ""),
    note: String(row.repeat_note ?? ""),
    total: Number(row.total ?? 0),
    status: String(row.status ?? ""),
    placedOn: String(row.created_at ?? ""),
    wantedOn: (row.wanted_on as string) ?? null,
  }));
}
