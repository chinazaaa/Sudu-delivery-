import { db } from "./supabase";
import { isGone } from "./orders";
import { parseRoutes, routeById, type ParcelJob, type Route } from "./parcels";
import { photosByOrder } from "./parcel-photos";
import { safeSettings } from "./settings";
import type { Order } from "./types";
import type { BatchStage } from "./stages";

/**
 * Every parcel that is still work, newest first.
 *
 * A parcel does not appear in Runs, which is right: it is one person's trip
 * and not a car anybody else is on. But that left nothing anywhere saying
 * "you agreed to carry this on Friday", so the only thing standing between a
 * parcel and being forgotten was remembering it.
 */
export async function parcelJobs(): Promise<ParcelJob[]> {
  const { data: orders, error } = await db()
    .from("orders")
    .select("*")
    .not("parcel_route", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];

  const rows = ((orders ?? []) as Order[]).filter((one) => !isGone(one.status));
  if (rows.length === 0) return [];

  // The day agreed lives on the trip, because that is what the order page
  // and the stages read.
  const { data: batches } = await db()
    .from("batches")
    .select("id, run_date, deliver_at, stage")
    .in("id", rows.map((one) => one.batch_id));
  const day = new Map(
    (
      (batches ?? []) as {
        id: string;
        run_date: string;
        deliver_at: string | null;
        stage: BatchStage;
      }[]
    ).map((one) => [one.id, one])
  );

  const routes: Route[] = parseRoutes((await safeSettings()).parcel_routes);
  const photos = await photosByOrder(rows.map((one) => one.id));

  return rows.map((order) => {
    const trip = day.get(order.batch_id);
    const shots = photos.get(order.id) ?? [];
    return {
      orderId: order.id,
      orderNo: order.order_no ?? null,
      name: order.customer_name,
      phone: order.customer_phone,
      status: order.status,
      route: routeById(routes, order.parcel_route ?? "")?.label ?? order.parcel_route ?? "",
      item: order.parcel_item ?? "",
      from: order.parcel_from ?? "",
      to: order.parcel_to ?? "",
      total: order.total,
      // Only a trip with a day set on it has been agreed. The run date alone
      // is the day it was asked for, which is not a promise.
      goesOn: trip?.deliver_at ? trip.run_date : "",
      wantedOn: order.parcel_wanted_on ?? "",
      stage: trip?.stage ?? "ordering",
      photos: {
        collected: shots.filter((one) => one.kind === "collected").length,
        handed: shots.filter((one) => one.kind === "handed").length,
      },
    };
  });
}

/**
 * The day a parcel trip is already going on this route, if one is.
 *
 * So the panel can say, before anybody agrees anything, that agreeing that
 * day puts this parcel on a car already going rather than sending a second
 * one to the same place.
 */
export async function tripGoingOn(
  route: string,
  notThisBatch: string
): Promise<string> {
  const { data: trips } = await db()
    .from("batches")
    .select("id, run_date")
    .eq("kind", "parcel")
    .not("deliver_at", "is", null)
    .in("stage", ["ordering", "closed"])
    .gte("run_date", new Date().toISOString().slice(0, 10));

  const rows = ((trips ?? []) as { id: string; run_date: string }[]).filter(
    (one) => one.id !== notThisBatch
  );
  if (rows.length === 0) return "";

  const { data: onThem } = await db()
    .from("orders")
    .select("batch_id, parcel_route")
    .in("batch_id", rows.map((one) => one.id));

  const match = ((onThem ?? []) as { batch_id: string; parcel_route: string | null }[]).find(
    (one) => one.parcel_route === route
  );
  return rows.find((one) => one.id === match?.batch_id)?.run_date ?? "";
}
