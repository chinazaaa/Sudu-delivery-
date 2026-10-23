import { db } from "./supabase";
import { emailAdmins } from "./email";
import { renderEmail, renderText, type Block } from "./email-html";
import { naira } from "./money";
import { siteUrl } from "./admin-templates";
import { safeSettings } from "./settings";
import { isReturningCustomer } from "./orders";
import { realPromoter } from "./promoters";
import { lagosInstant, lagosToday } from "./time";
import { normalisePhone } from "./phone";
import { parcels, isCustom, liveRoutes, routeById, feeFor, heaviest } from "./parcels";
import { askFor } from "./requests";
import { newPin } from "./customer-auth";
import { tellAdmin } from "./admin-alerts";

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
  /** Who brought them, on a first order. Their promoter for life, so it is
   *  only ever written when they are new. */
  heardFrom: string;
  paymentMethod: "transfer" | "card";
  /** Whose money the card link is made out in. Naira unless they say. */
  payCurrency?: "GBP" | "USD";
};

export type ParcelResult =
  /** Placed, priced and waiting to be paid for. */
  | { ok: true; orderId: string; asked?: false }
  /** Asked about rather than placed: the trip nobody has priced. Nothing is
   *  charged, and somebody comes back with a figure. */
  | { ok: true; asked: true; orderId?: undefined }
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

  /*
   * The trip nobody has priced.
   *
   * Four towns each way covers most of what gets asked for and none of what
   * does not: a pickup in Epe, a box plainly heavier than the heaviest band,
   * a shop that will only release the thing to a named person. Those were a
   * dead end on a page whose whole job is to say yes.
   *
   * So one route places nothing. It asks, the way the custom order page
   * asks, and somebody comes back with a figure. Here rather than in the
   * form that posts to it, because two forms post to it: the website's and
   * the app's, and a rule written twice is a rule that will disagree with
   * itself.
   */
  if (isCustom(route)) return quoteParcel(input, route.label);

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
      ...(input.paymentMethod === "card" && input.payCurrency
        ? { pay_currency: input.payCurrency }
        : {}),
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
      // Checked against the promoters table rather than trusted: the code
      // comes off a form, and a made-up one would pay commission to nobody
      // for ever.
      const code = input.heardFrom.trim();
      const brought = code !== "" && (await realPromoter(code)) ? code : null;
      await db()
        .from("customers")
        .insert({
          phone,
          name,
          hostel,
          pin: newPin(),
          ...(brought ? { promoter_code: brought } : {}),
        });
    }
  } catch {
    /* The parcel exists either way. */
  }

  // The phone, before the email, and in its own try: a parcel that is
  // already saved must not be undone by either of them.
  try {
    await tellAdmin({
      title: `Parcel booked · ${naira(fee)}`,
      body: `${item} on ${route.label}. ${name}, unpaid.`,
      // Parcels have their own board, where a day is agreed and the trip is
      // the thing that gets arranged.
      url: "/admin/parcels",
    });
  } catch {
    /* Never at the cost of a parcel that is already saved. */
  }

  await announceParcel({
    orderId: order.id as string,
    name,
    phone,
    route: route.label,
    item,
    shop,
    from,
    to,
    kg,
    value,
    fee,
    wanted,
    note: input.note.trim(),
  });

  return { ok: true, orderId: order.id as string };
}

/**
 * The email that says a parcel has come in.
 *
 * Every other order sends one and a parcel did not, so the first anybody knew
 * of it was somebody happening to open admin. Its own wording rather than the
 * food one: there are no lines to group by restaurant, and what is needed
 * first is where to go, what to ask for and which day was asked for, because
 * agreeing that day is the next thing somebody has to do.
 */
async function announceParcel(args: {
  orderId: string;
  name: string;
  phone: string;
  route: string;
  item: string;
  shop: string;
  from: string;
  to: string;
  kg: number;
  value: number;
  fee: number;
  wanted: string;
  note: string;
}): Promise<void> {
  try {
    const url = await siteUrl().catch(() => "");
    const link = url ? `${url}/admin/orders/${args.orderId}` : "";
    const title = `New parcel · ${args.name} · ${args.route} · ${naira(args.fee)}`;

    const blocks: Block[] = [
      {
        kind: "text",
        text: `${args.name} wants a parcel carried, ${args.route}. They asked for ${args.wanted}.`,
      },
      ...(link ? [{ kind: "button" as const, label: "Open the parcel", href: link }] : []),
      {
        kind: "rows",
        rows: [
          { label: "Total", value: `${naira(args.fee)} · unpaid` },
          { label: "Day they asked for", value: args.wanted },
          { label: "Collect", value: args.from },
          { label: "From", value: args.shop },
          { label: "What", value: args.item },
          { label: "Take to", value: args.to },
          { label: "Weight", value: `Up to ${args.kg}kg` },
          { label: "Worth", value: naira(args.value) },
          { label: "Number", value: args.phone },
        ],
      },
      {
        kind: "note",
        text:
          "Nothing happens until the day is agreed. Open it, say whether that " +
          "day works, and their page stops saying the day is not agreed yet.",
      },
      ...(args.note ? [{ kind: "note" as const, text: `They asked: ${args.note}` }] : []),
    ];

    const tagline = (await safeSettings()).tagline || undefined;
    await emailAdmins(
      title,
      renderText(title, blocks),
      renderEmail(title, blocks, tagline),
      "order"
    );
  } catch {
    /* Never let a notification break a parcel that is already saved. */
  }
}

/**
 * A parcel nobody has priced, asked about rather than ordered.
 *
 * Everything the form collected goes into the one list somebody already
 * reads and answers: the custom order list. Nothing is charged, no trip is
 * made, and no order exists to chase for money that was never agreed.
 *
 * The weight is not asked for and not kept. It is the one thing on that
 * form that only means something against a ladder, and this route has none.
 */
async function quoteParcel(
  input: ParcelInput,
  routeSaid: string
): Promise<ParcelResult> {
  const where = input.address.trim();
  const block = input.hostel.trim();
  const room = input.room.trim();

  const asked = await askFor({
    wanted: `Parcel: ${input.item.trim() || "something"}`,
    budget: "",
    name: input.name,
    phone: input.phone,
    hostel: block,
    note: [
      `Route: ${routeSaid}`,
      `Collecting from: ${input.shop.trim() || "not said"}`,
      where !== "" ? `Address: ${where}` : "",
      block !== "" ? `Block: ${block}${room !== "" ? `, ${room}` : ""}` : "",
      input.wantedOn.trim() !== "" ? `Wanted on: ${input.wantedOn.trim()}` : "",
      input.toName.trim() !== ""
        ? `Going to: ${input.toName.trim()} ${input.toPhone.trim()}`.trim()
        : "",
      Number(input.value) > 0 ? `Worth about: ${naira(Number(input.value))}` : "",
      input.note.trim(),
    ]
      .filter((one) => one !== "")
      .join("\n"),
  });
  if (!asked.ok) return { ok: false, error: asked.error };

  // After the row exists and never in a way that can fail it.
  try {
    await tellAdmin({
      title: "Parcel · needs a price",
      body: `${input.name.trim() || "Someone"} wants a parcel carried: ${
        input.item.trim() || "something"
      }.`,
      url: "/admin/requests",
    });
  } catch {
    /* The ask is saved either way. */
  }

  return { ok: true, asked: true };
}
