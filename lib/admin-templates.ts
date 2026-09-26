import { headers } from "next/headers";
import { naira, shareRef } from "./money";
import {
  narration,
  template,
  whatsappTo,
  templateLabel,
  type Ordered,
  type TemplateKind,
} from "./messages";
import type { Settings } from "./settings";
import { parseRoutes, routeById } from "./parcels";
import type { FeedOrder } from "./admin-data";
import type { OrderCardData } from "@/components/admin/OrderCard";

/** Links inside a message have to be absolute, so they come from the request. */
export async function siteUrl(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

/** Which templates are worth offering depends on where the order has got to. */
function kindsFor(order: FeedOrder): TemplateKind[] {
  // Card is offered on any unpaid order, not only one that chose card at
  // checkout. People change their mind about how they want to pay, and the
  // answer should not be to go and edit the order first.
  if (order.status === "pending") return ["payment", "card", "pin"];
  if (order.status === "refunded") return ["pin"];
  // Delivered is a different conversation from paid. Confirming a payment,
  // saying the food is here and warning that a run is late are all about
  // food on its way, and offering them on a bag somebody ate an hour ago is
  // four buttons nobody will press hiding the one they want.
  if (order.status === "delivered") return ["review", "pin"];
  return ["confirmed", "ready", "late", "pin"];
}

/** Turns an order into everything the admin card needs, links included. */
/**
 * A parcel as a list of questions and answers, in the order the sender was
 * asked them.
 *
 * Which end is campus decides half the wording, so the route is looked up
 * rather than guessed: on "Lekki/Ikoyi to PAU" the address is where we
 * collect, and on the way back it is where we deliver.
 */
function parcelAnswers(
  order: FeedOrder,
  settings: Settings
): { route: string; answers: { question: string; answer: string }[] } | null {
  if (!order.parcel_route) return null;

  const route = routeById(parseRoutes(settings.parcel_routes), order.parcel_route);
  const toPau = route?.toPau ?? (order.parcel_to ?? "").startsWith("PAU");

  // A parcel sent before the answers were kept separately still has them,
  // glued into the two ends of the trip: the off-campus end is the address,
  // and the campus end is "PAU, <block>, <room>". Read back out rather than
  // shown as a dash, because a dash says they left it empty and they did not.
  const campusEnd = (toPau ? order.parcel_to : order.parcel_from) ?? "";
  const offCampusEnd = (toPau ? order.parcel_from : order.parcel_to) ?? "";
  const address = (order.parcel_address ?? "").trim() || offCampusEnd;
  const room =
    (order.parcel_room ?? "").trim() ||
    campusEnd
      .replace(/^PAU,\s*/i, "")
      .replace(new RegExp(`^${order.hostel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},?\\s*`, "i"), "")
      .trim();

  const answers = [
    ["Where is it going?", route?.label ?? order.parcel_route],
    ["When would they like it?", order.parcel_wanted_on ?? "They did not say"],
    ["About how heavy is it?", order.parcel_kg ? `Up to ${order.parcel_kg}kg` : ""],
    ["What are we carrying?", order.parcel_item ?? ""],
    [
      toPau
        ? "Which shop or person are we collecting from?"
        : "Who is it going to?",
      order.parcel_shop ?? "",
    ],
    [
      toPau ? "The address we are collecting from" : "The address we are delivering to",
      address,
    ],
    [
      toPau ? "Which block are we bringing it to?" : "Which block are we collecting from?",
      order.hostel,
    ],
    ["Room or landmark", room],
    [
      "Roughly what is it worth?",
      order.parcel_value ? naira(order.parcel_value) : "",
    ],
    [
      "Who receives it?",
      order.deliver_to_name
        ? `${order.deliver_to_name}${
            order.deliver_to_phone ? ` · ${order.deliver_to_phone}` : ""
          }`
        : "Them",
    ],
    ["Anything else we should know?", order.customer_note],
  ] as const;

  return {
    route: route?.label ?? order.parcel_route,
    // An unanswered question is still worth showing: a blank where an
    // address should be is the thing worth noticing.
    answers: answers.map(([question, answer]) => ({
      question,
      answer: String(answer ?? "").trim() || "—",
    })),
  };
}

export function toCard(
  order: FeedOrder,
  settings: Settings,
  url: string,
  /** The account the message quotes. The first on the list. */
  bank?: { bank_name: string; account_name: string; account_number: string } | null
): OrderCardData {
  // Which of the three shops this order came from, for the one word that
  // changes between them: food, order or parcel.
  const what: Ordered = order.parcel_route
    ? "parcel"
    : order.batchKind === "skincare"
      ? "order"
      : "food";

  const write = (kind: TemplateKind) =>
    template({
      kind,
      order: { ...order, groupOrders: order.groupOrders },
      settings,
      pin: order.pin,
      siteUrl: url,
      batchLabel: order.batchLabel,
      deliveryWindow: order.deliveryWindow,
      what,
      bank,
    });

  return {
    id: order.id,
    ref: shareRef(order, order.groupOrders),
    name: order.customer_name,
    forName: order.for_name,
    phone: order.customer_phone,
    source: (order as { source?: string }).source ?? "",
    hostel: order.hostel,
    batchLabel: order.batchLabel,
    status: order.status,
    total: order.total,
    fee: order.fee,
    food: order.subtotal_food,
    joinedDelivery: order.shared_with !== null,
    awaitingGroup: order.awaitingGroup ?? false,
    discount: order.discount,
    couponCode: order.coupon_code,
    createdAt: order.created_at,
    paymentMethod: order.payment_method,
    pin: order.pin,
    paymentLink: order.payment_link,
    otherItems: order.otherItems,
    otherFee: order.otherFee,
    inGroup: order.group_id !== null,
    // One number ties the parts together, so a group is obvious at a glance
    // and one click brings up the rest of it.
    groupRef:
      order.groupOrders.length > 1
        ? shareRef(order.groupOrders[0], order.groupOrders).replace("#", "")
        : null,
    groupSize: order.groupOrders.length,
    runStage: order.batchStage,
    promoter: order.promoter ?? null,
    // A parcel carries no lines at all, so the card needs the trip itself.
    //
    // The questions as they were asked, with what was typed into them.
    // Summarising was how "Which block are we bringing it to?" and "Room or
    // landmark" became one line called "Take to", and a block ended up
    // reading as part of a street.
    parcel: parcelAnswers(order, settings),
    customerNote: order.customer_note ?? "",
    adminNote: order.admin_note ?? "",
    narration: narration(order, order.groupOrders),
    lines: order.lines.map((line) => ({
      id: line.id,
      qty: line.qty,
      name: line.name,
      restaurant: line.restaurant,
      choices: line.choices,
      for_name: line.for_name,
      unit_price_at_order: line.unit_price_at_order,
    })),
    templates: kindsFor(order).map((kind) => ({
      kind,
      label: templateLabel(kind, what),
      href: whatsappTo(order.customer_phone, write(kind)),
    })),
  };
}
