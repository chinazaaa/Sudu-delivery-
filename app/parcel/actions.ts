"use server";

import { redirect } from "next/navigation";
import { placeParcel } from "@/lib/parcel-order";
import { isCustom, parcels, routeById } from "@/lib/parcels";
import { askFor } from "@/lib/requests";
import { tellAdmin } from "@/lib/admin-alerts";

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

  /*
   * The trip nobody has priced.
   *
   * Four towns each way covers most of what gets asked for and none of what
   * does not: a pickup in Epe, something that plainly will not fit in three
   * kilos, a shop that will only hand it to a named person. Those were a
   * dead end on a page whose whole job is to say yes.
   *
   * So that route does not place an order. It asks, the way the custom
   * order page asks, and somebody comes back with a figure. Nothing is
   * charged, nothing is promised, and nobody is quoted off a ladder that
   * was never meant for them.
   */
  const setup = await parcels();
  const chosen = routeById(setup.routes, said("route"));
  if (chosen && isCustom(chosen)) {
    const where = said("address").trim();
    const block = said("hostel").trim();
    const asked = await askFor({
      wanted: `Parcel: ${said("item").trim() || "something"}`,
      budget: "",
      name: said("name"),
      phone: said("phone"),
      hostel: block,
      note: [
        `Collecting from: ${said("shop").trim() || "not said"}`,
        where !== "" ? `Address: ${where}` : "",
        block !== "" ? `Block: ${block}${said("room").trim() ? `, ${said("room").trim()}` : ""}` : "",
        said("wanted_on").trim() !== "" ? `Wanted on: ${said("wanted_on").trim()}` : "",
        said("to_name").trim() !== ""
          ? `Going to: ${said("to_name").trim()} ${said("to_phone").trim()}`.trim()
          : "",
        said("value").trim() !== "" ? `Worth about: ${said("value").trim()}` : "",
        said("note").trim(),
      ]
        .filter((one) => one !== "")
        .join("\n"),
    });
    if (!asked.ok) return { error: asked.error };

    // After the row exists and never in a way that can fail it.
    try {
      await tellAdmin({
        title: "Parcel · needs a price",
        body: `${said("name").trim() || "Someone"} wants a parcel carried: ${
          said("item").trim() || "something"
        }.`,
        url: "/admin/requests",
      });
    } catch {
      /* The ask is saved either way. */
    }

    redirect("/parcel?asked=1");
  }

  const result = await placeParcel({
    name: said("name"),
    phone: said("phone"),
    hostel: said("hostel"),
    room: said("room"),
    routeId: said("route"),
    item: said("item"),
    shop: said("shop"),
    address: said("address"),
    value: Number(said("value").replace(/[^\d]/g, "")),
    kg: Number(said("kg")),
    wantedOn: said("wanted_on"),
    toName: said("to_name"),
    toPhone: said("to_phone"),
    note: said("note"),
    heardFrom: said("heard_from"),
    paymentMethod: said("payment_method") === "card" ? "card" : "transfer",
    // Only ever on a card. A transfer is naira into a Nigerian account, and
    // a currency riding along on one is a Stripe link nobody asked for.
    payCurrency:
      said("payment_method") === "card"
        ? ((): "GBP" | "USD" | undefined => {
            const money = said("pay_currency").toUpperCase();
            return money === "GBP" || money === "USD" ? money : undefined;
          })()
        : undefined,
  });

  if (!result.ok) return { error: result.error };
  redirect(`/o/${result.orderId}?placed=1`);
}
