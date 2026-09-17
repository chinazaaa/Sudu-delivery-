import { headers } from "next/headers";
import { template, whatsappTo, TEMPLATE_LABEL, type TemplateKind } from "./messages";
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
  if (order.status === "pending") {
    const asking: TemplateKind[] = ["payment"];
    if (order.payment_method === "card") asking.push("card");
    return [...asking, "pin"];
  }
  if (order.status === "refunded") return ["pin"];
  return ["confirmed", "ready", "late", "pin"];
}

/** Turns an order into everything the admin card needs, links included. */
export function toCard(
  order: FeedOrder,
  settings: Settings,
  url: string
): OrderCardData {
  const write = (kind: TemplateKind) =>
    template({
      kind,
      order,
      settings,
      pin: order.pin,
      siteUrl: url,
      batchLabel: order.batchLabel,
      deliveryWindow: order.deliveryWindow,
    });

  return {
    id: order.id,
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
