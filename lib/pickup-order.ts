import { db } from "./supabase";
import { lagosToday } from "./time";
import { CUSTOM } from "./shelf";
import type { Batch } from "./types";

/**
 * Turning a campus pickup into an ordinary order, with no run to set up.
 *
 * The order needs a batch because every order does, so one car is kept for
 * pickups each day: made the first time one is converted, shared by the rest.
 * It sits on the run list like any car, and receipts and profit read it the
 * way they read any other order.
 */
const PICKUP_LABEL = "Campus pickup";

async function pickupBatchToday(): Promise<Batch | null> {
  const today = lagosToday();
  const { data: already } = await db()
    .from("batches")
    .select("*")
    .eq("kind", "same_day")
    .eq("run_date", today)
    .eq("delivery_window_text", PICKUP_LABEL)
    .neq("status", "cancelled")
    .in("stage", ["ordering", "closed"])
    .limit(1);
  const sharing = (already ?? [])[0] as Batch | undefined;
  if (sharing) return sharing;

  // Seven in the evening Lagos time, or half an hour from now if that has
  // gone: the pickup hours end there and nothing reads this for more.
  const evening = new Date(`${today}T18:00:00Z`).getTime();
  const at = new Date(Math.max(evening, Date.now() + 30 * 60_000));
  const { data, error } = await db()
    .from("batches")
    .insert({
      run_date: today,
      slot: at.getUTCHours() >= 16 ? "night" : "afternoon",
      cut_off_at: new Date().toISOString(),
      delivery_window_text: PICKUP_LABEL,
      status: "open",
      capacity: null,
      flash_fee: null,
      flash_fee_reason: "",
      stage: "ordering",
      stage_updated_at: new Date().toISOString(),
      kind: "same_day",
      deliver_at: at.toISOString(),
    })
    .select("*")
    .single();
  if (error) {
    console.error("pickup batch failed:", error.message);
    return null;
  }
  return (data as Batch) ?? null;
}

/** The one line every pickup order carries, so a receipt says what it was. */
async function pickupItemId(): Promise<string | null> {
  const { data: shop } = await db()
    .from("restaurants")
    .select("id")
    .eq("kind", CUSTOM)
    .limit(1)
    .maybeSingle();
  const restaurantId = (shop as { id?: string } | null)?.id;
  if (!restaurantId) return null;

  const { data: found } = await db()
    .from("menu_items")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("name", PICKUP_LABEL)
    .limit(1)
    .maybeSingle();
  if (found) return (found as { id: string }).id;

  const { data: made } = await db()
    .from("menu_items")
    .insert({ restaurant_id: restaurantId, name: PICKUP_LABEL, price_food: 0 })
    .select("id")
    .single();
  return (made as { id?: string } | null)?.id ?? null;
}

export async function createPickupOrder(args: {
  phone: string;
  name: string;
  hostel: string;
  fee: number;
  note: string;
}): Promise<string | null> {
  const [batch, itemId] = await Promise.all([pickupBatchToday(), pickupItemId()]);
  if (!batch || !itemId) return null;

  const { data: order, error } = await db()
    .from("orders")
    .insert({
      batch_id: batch.id,
      customer_phone: args.phone,
      customer_name: args.name,
      hostel: args.hostel,
      subtotal_food: 0,
      fee: args.fee,
      discount: 0,
      total: args.fee,
      customer_note: args.note.slice(0, 500),
      payment_method: "transfer",
      status: "pending",
      source: "desk",
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("pickup order failed:", error?.message);
    return null;
  }
  const id = (order as { id: string }).id;

  const { error: lineError } = await db()
    .from("order_items")
    .insert({ order_id: id, menu_item_id: itemId, qty: 1, unit_price_at_order: 0 });
  if (lineError) {
    await db().from("orders").delete().eq("id", id);
    return null;
  }
  return id;
}
