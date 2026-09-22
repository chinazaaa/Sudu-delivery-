"use server";

import { redirect } from "next/navigation";
import { placeParcel } from "@/lib/parcel-order";

export type ParcelState = { error: string };

/**
 * A parcel, from the form to its own trip.
 *
 * Returns the error rather than throwing it: a throw from a server action
 * goes to the error boundary, which loses everything they typed and tells
 * them nothing about what was wrong with it.
 */
export async function sendParcel(
  _prev: ParcelState,
  form: FormData
): Promise<ParcelState> {
  const said = (name: string) => String(form.get(name) ?? "");

  const result = await placeParcel({
    name: said("name"),
    phone: said("phone"),
    hostel: said("hostel"),
    routeId: said("route"),
    item: said("item"),
    shop: said("shop"),
    address: said("address"),
    value: Number(said("value").replace(/[^\d]/g, "")),
    kg: Number(said("kg")),
    toName: said("to_name"),
    toPhone: said("to_phone"),
    note: said("note"),
    paymentMethod: said("payment_method") === "card" ? "card" : "transfer",
  });

  if (!result.ok) return { error: result.error };
  redirect(`/o/${result.orderId}?placed=1`);
}
