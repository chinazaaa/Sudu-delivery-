import { headers } from "next/headers";
import { shareRef } from "./money";
import {
  narration,
  template,
  whatsappTo,
  TEMPLATE_LABEL,
  type TemplateKind,
} from "./messages";
import type { Settings } from "./settings";
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
  return ["confirmed", "ready", "late", "pin"];
}

/** Turns an order into everything the admin card needs, links included. */
export function toCard(
  order: FeedOrder,
  settings: Settings,
  url: string,
  /** The account the message quotes. The first on the list. */
  bank?: { bank_name: string; account_name: string; account_number: string } | null
): OrderCardData {
  const write = (kind: TemplateKind) =>
    template({
      kind,
      order: { ...order, groupOrders: order.groupOrders },
      settings,
      pin: order.pin,
      siteUrl: url,
      batchLabel: order.batchLabel,
      deliveryWindow: order.deliveryWindow,
      bank,
    });

  return {
    id: order.id,
    ref: shareRef(order, order.groupOrders),
    name: order.customer_name,
    forName: order.for_name,
    phone: order.customer_phone,
    hostel: order.hostel,
    batchLabel: order.batchLabel,
    status: order.status,
    total: order.total,
    fee: order.fee,
    food: order.subtotal_food,
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
      label: TEMPLATE_LABEL[kind],
      href: whatsappTo(order.customer_phone, write(kind)),
    })),
  };
}
