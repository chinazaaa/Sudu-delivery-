import { db } from "./supabase";
import type { ParcelPhoto } from "./parcels";

/**
 * The photographs on a parcel, oldest first.
 *
 * Tolerant of a database that has not had the table yet: a parcel with no
 * photographs is the right answer for one, and this is read on the order
 * page, which must never go down for the sake of an empty gallery.
 */
export async function photosFor(orderId: string): Promise<ParcelPhoto[]> {
  const { data, error } = await db()
    .from("parcel_photos")
    .select("id, kind, url, note, created_at")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) return [];
  return (data ?? []) as ParcelPhoto[];
}

/** The photographs on several parcels at once, keyed by order. */
export async function photosByOrder(
  orderIds: string[]
): Promise<Map<string, ParcelPhoto[]>> {
  const byOrder = new Map<string, ParcelPhoto[]>();
  const unique = [...new Set(orderIds.filter(Boolean))];
  if (unique.length === 0) return byOrder;

  const { data, error } = await db()
    .from("parcel_photos")
    .select("id, order_id, kind, url, note, created_at")
    .in("order_id", unique)
    .order("created_at");
  if (error) return byOrder;

  for (const row of (data ?? []) as (ParcelPhoto & { order_id: string })[]) {
    byOrder.set(row.order_id, [...(byOrder.get(row.order_id) ?? []), row]);
  }
  return byOrder;
}
