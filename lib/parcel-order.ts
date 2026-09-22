import { db } from "./supabase";
import { isReturningCustomer } from "./orders";
import { lagosInstant, lagosToday } from "./time";
import { normalisePhone } from "./phone";
import { parcels, liveRoutes, routeById, feeFor, heaviest } from "./parcels";
import { newPin } from "./customer-auth";

export type ParcelInput = {
  name: string;
  phone: string;
  /** The block on campus. One end of every route is PAU, and a block is the
   *  whole of what anybody needs there. */
  hostel: string;
  /** The room or landmark inside that block, which the block alone does not
   *  give: a bag at Ikoyi Hall is a bag at a building with four hundred
   *  rooms. */
  room: string;
  routeId: string;
  /** What it is, so the right parcel is collected. Not for the books. */
  item: string;
  /** The shop or person it is collected from, and where they are. */
  shop: string;
  /** The address at the end that is not campus. */
  address: string;
  /** What it is worth, against the cap. */
  value: number;
  /** The weight band picked, as its upper bound in kilos. */
  kg: number;
  /** The day they would like it, as "2026-09-30". A request, not a promise:
   *  the shop agrees it afterwards. */
  wantedOn: string;
  /** Who receives it, where that is not the person paying. */
  toName: string;
  toPhone: string;
  note: string;
  paymentMethod: "transfer" | "card";
};

export type ParcelResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/**
 * A parcel, taken as its own trip.
 *
 * There is no Mainland to PAU run and there never will be, so this does not
 * join anything: it makes a batch of its own, the way a skincare drop does,
 * and puts one order on it. Everything downstream then works unchanged, so a
 * parcel is chased for payment, given a PIN and counted in the books exactly
 * as an order of food is.
 *
 * The day is not promised here. The shop agrees the time with whoever is
 * sending it, which is the whole reason this is not a run.
 */
export async function placeParcel(input: ParcelInput): Promise<ParcelResult> {
  const setup = await parcels();
  if (!setup.on) {
    return { ok: false, error: "We are not carrying parcels just now." };
  }

  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That phone number doesn't look right." };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please enter your name." };

  const route = routeById(liveRoutes(setup.routes), input.routeId);
  if (!route) return { ok: false, error: "Pick where it is going from and to." };

  // Priced by how heavy it is as well as how far it goes. A dress and a chest
  // of drawers do not take the same room or the same effort.
  const kg = Math.max(0, Math.round(Number(input.kg) || 0));
  const fee = feeFor(route, kg);
  if (kg <= 0 || fee === null) {
    return {
      ok: false,
      error: `Pick a weight. That route carries up to ${heaviest(route)}kg; message us for anything heavier.`,
    };
  }

  const item = input.item.trim();
  if (item.length < 2) {
    return { ok: false, error: "Say what the parcel is, so we collect the right one." };
  }

  const shop = input.shop.trim();
  if (shop.length < 2) {
    return { ok: false, error: "Say which shop or person we are collecting it from." };
  }

  // One end of every route is campus, where a block is the whole address
  // anybody needs. The other end is a real address, and without it nobody is
  // finding a dress in a boutique off Admiralty Way.
  const hostel = input.hostel.trim();
  if (hostel.length < 1) {
    return {
      ok: false,
      error: route.toPau
        ? "Which block are we bringing it to?"
        : "Which block are we collecting it from?",
    };
  }

  const address = input.address.trim();
  if (address.length < 6) {
    return {
      ok: false,
      error: route.toPau
        ? "We need the address we are collecting from."
        : "We need the address we are delivering to.",
    };
  }

  const room = input.room.trim();
  const campus = room ? `PAU, ${hostel}, ${room}` : `PAU, ${hostel}`;
  const from = route.toPau ? address : campus;
  const to = route.toPau ? campus : address;

  // A cap is the whole of the shop's protection here: if it is lost or broken
  // in the car that is the shop's problem, so the worst case has to stay
  // survivable. Refused rather than quietly accepted, because somebody who
  // was not told is somebody who will argue about it later.
  const value = Math.max(0, Math.round(Number(input.value) || 0));
  if (value <= 0) return { ok: false, error: "Say roughly what it is worth." };
  if (value > setup.maxValue) {
    return {
      ok: false,
      error: `We do not carry anything worth more than ₦${setup.maxValue.toLocaleString(
        "en-NG"
      )}. Message us and we will talk it through.`,
    };
  }

  // Who receives it. Half an answer is worse than none: a parcel with a name
  // and no number is a box at a gate with nobody to call. Left blank
  // altogether, it is the person sending it.
  const toName = input.toName.trim();
  const toPhone = normalisePhone(input.toPhone);
  if ((toName !== "" || input.toPhone.trim() !== "") && (toName === "" || !toPhone)) {
    return {
      ok: false,
      error: "For somebody else, we need both their name and a number that works.",
    };
  }

  // The day they asked for. Today or later, because a parcel cannot be
  // carried yesterday, and a fortnight is as far ahead as anything else here
  // is planned.
  const wanted = /^\d{4}-\d{2}-\d{2}$/.test(input.wantedOn) ? input.wantedOn : "";
  if (wanted === "" || wanted < lagosToday()) {
    return { ok: false, error: "Pick the day you would like it, today or later." };
  }

  // Its own trip, on the day they asked for, which is not yet a day anybody
  // has agreed to: deliver_at is what says the shop has agreed, and it stays
  // empty until somebody sets it.
  const { data: batch, error: batchError } = await db()
    .from("batches")
    .insert({
      run_date: wanted,
      slot: "afternoon",
      // The end of the day they asked for, so nothing reads as already
      // closed. The real one is set when the day is agreed.
      cut_off_at: lagosInstant(wanted, 23, 59),
      delivery_window_text: `Parcel · ${route.label}`,
      status: "open",
      capacity: null,
      flash_fee: null,
      flash_fee_reason: "",
      stage: "ordering",
      stage_updated_at: new Date().toISOString(),
      kind: "parcel",
      fuel_cost: 0,
      food_spend: 0,
      driver_cost: 0,
      other_cost: 0,
      cost_note: "",
    })
    .select("id")
    .single();
  if (batchError || !batch) {
    return { ok: false, error: "Could not start that one. Try again in a moment." };
  }

  // Nothing is bought, so there is no food to charge for: the fee is the
  // whole of it.
  const { data: order, error } = await db()
    .from("orders")
    .insert({
      batch_id: batch.id,
      customer_phone: phone,
      customer_name: name,
      hostel,
      subtotal_food: 0,
      fee,
      discount: 0,
      total: fee,
      status: "pending",
      payment_method: input.paymentMethod,
      customer_note: input.note.trim(),
      parcel_route: route.id,
      parcel_item: item,
      parcel_shop: shop,
      parcel_value: value,
      parcel_kg: kg,
      parcel_wanted_on: wanted,
      parcel_address: address,
      parcel_room: room,
      parcel_from: from,
      parcel_to: to,
      ...(toName && toPhone ? { deliver_to_name: toName, deliver_to_phone: toPhone } : {}),
    })
    .select("id")
    .single();

  if (error || !order) {
    // The trip was only ever for this parcel, so it goes with it rather than
    // sitting in the runs list as a car for nothing.
    await db().from("batches").delete().eq("id", batch.id);
    return { ok: false, error: "Could not save that one. Try again in a moment." };
  }

  // Their PIN is how they read their own orders later, and a parcel is an
  // order like any other. Never at the cost of the parcel itself.
  try {
    if (!(await isReturningCustomer(phone))) {
      await db()
        .from("customers")
        .insert({ phone, name, hostel, pin: newPin() });
    }
  } catch {
    /* The parcel exists either way. */
  }

  return { ok: true, orderId: order.id as string };
}
