import { naira } from "./money";
import { SLOT_LABEL } from "./config";
import { weekdayLabel } from "./time";
import type { Settings } from "./settings";
import type { HandoutOrder } from "./admin";

/**
 * The confirmation the brief asks for, written as a message the admin sends by
 * hand on WhatsApp. No SMS provider, no monthly bill, and it reads like a
 * person rather than a robot.
 */
export function confirmationMessage(args: {
  order: HandoutOrder;
  settings: Settings;
  pin: string | null;
  siteUrl: string;
  deliveryWindow: string;
  runDate: string;
  slot: keyof typeof SLOT_LABEL;
}): string {
  const { order, settings, pin, siteUrl } = args;
  const batch = `${weekdayLabel(args.runDate)} ${SLOT_LABEL[args.slot]}`;
  const lines: string[] = [];

  if (order.status === "pending") {
    lines.push(
      `Hi ${order.for_name ?? order.customer_name}, your ${batch} order is saved. ` +
        `Total ${naira(order.total)}.`
    );
    if (settings.bank_name && settings.bank_account_number) {
      lines.push(
        "",
        `${settings.bank_account_name} ${settings.bank_account_number} ` +
          `(${settings.bank_name}). Put ${order.customer_phone} as the narration.`
      );
    }
  } else {
    lines.push(
      `Hi ${order.for_name ?? order.customer_name}, your ${batch} order is confirmed. ` +
        `${args.deliveryWindow}.`
    );
  }

  lines.push("", `Your order: ${siteUrl}/o/${order.id}`);
  if (pin) lines.push(`All your orders: ${siteUrl}/orders, PIN ${pin}`);

  return lines.join("\n");
}

/** wa.me needs international digits with no plus. */
export function whatsappTo(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

export type TemplateKind =
  | "confirmed"
  | "payment"
  | "card"
  | "pin"
  | "ready"
  | "late";

export const TEMPLATE_LABEL: Record<TemplateKind, string> = {
  confirmed: "Payment confirmed",
  payment: "Ask for payment",
  card: "Send card link",
  pin: "Send their PIN",
  ready: "Food is here",
  late: "Running late",
};

type TemplateOrder = {
  id: string;
  customer_name: string;
  customer_phone: string;
  for_name: string | null;
  total: number;
  hostel: string;
  payment_link?: string | null;
};

/**
 * Every message the admin ever sends, written out for her. Nothing is sent by
 * a robot: she taps a template, WhatsApp opens with the words already in it,
 * and she presses send herself.
 */
export function template(args: {
  kind: TemplateKind;
  order: TemplateOrder;
  settings: Settings;
  pin: string | null;
  siteUrl: string;
  batchLabel: string;
  deliveryWindow: string;
}): string {
  const { order, settings, pin, siteUrl, batchLabel } = args;
  const who = order.for_name ?? order.customer_name;
  const orderLink = `${siteUrl}/o/${order.id}`;
  const pinLine = pin ? `Your PIN is ${pin}. Every order you place: ${siteUrl}/orders` : "";

  switch (args.kind) {
    case "confirmed":
      return [
        `Hi ${who}, your payment is confirmed. You are on the ${batchLabel} run.`,
        "",
        `${args.deliveryWindow}. Your name is called at the drop point.`,
        `Your order: ${orderLink}`,
        pinLine,
      ]
        .filter(Boolean)
        .join("\n");

    case "payment":
      return [
        `Hi ${who}, your ${batchLabel} order comes to ${naira(order.total)}.`,
        settings.bank_name && settings.bank_account_number
          ? `\n${settings.bank_account_name} ${settings.bank_account_number} (${settings.bank_name}). ` +
            `Put ${order.customer_phone} as the narration.`
          : "",
        `\nYour order: ${orderLink}`,
      ]
        .filter(Boolean)
        .join("\n");

    case "card":
      return [
        `Hi ${who}, here is the card link for your ${batchLabel} order ` +
          `(${naira(order.total)}):`,
        "",
        order.payment_link ?? "(link coming in the next message)",
        "",
        `Your order: ${orderLink}`,
      ].join("\n");

    case "pin":
      return [
        `Hi ${who}, here is your Sudu PIN: ${pin ?? "----"}.`,
        "",
        `Open ${siteUrl}/orders, put in your number and that PIN, and every order ` +
          `you have placed is there.`,
      ].join("\n");

    case "ready":
      return [
        `Hi ${who}, your food is at the drop point now. ${order.hostel}.`,
        "",
        "Come and collect it while it is hot.",
      ].join("\n");

    case "late":
      return [
        `Hi ${who}, the ${batchLabel} run is running a little behind.`,
        "",
        "Your food is coming. I will message again when it is at the drop point.",
      ].join("\n");
  }
}
