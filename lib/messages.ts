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
