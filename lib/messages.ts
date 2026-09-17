import { naira, orderRef } from "./money";
import type { Settings } from "./settings";

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

/** Which settings field holds the admin's own wording for each template. */
export const TEMPLATE_FIELD: Record<TemplateKind, keyof Settings> = {
  confirmed: "msg_confirmed",
  payment: "msg_payment",
  card: "msg_card",
  pin: "msg_pin",
  ready: "msg_ready",
  late: "msg_late",
};

/** The wording used until the admin writes their own. */
export const TEMPLATE_DEFAULT: Record<TemplateKind, string> = {
  confirmed:
    "Hi {name}, your payment for order {ref} is confirmed. You are on the {batch} run.\n\n" +
    "We deliver to {hostel}, {window}.\n" +
    "Your order: {link}\n{pin_line}",
  payment:
    "Hi {name}, your {batch} order {ref} comes to {total}.\n\n" +
    "{bank}\n\nYour order: {link}",
  card:
    "Hi {name}, here is the card link for your {batch} order ({total}):\n\n" +
    "{card_link}\n\nYour order: {link}",
  pin:
    "Hi {name}, here is your Sudu PIN: {pin}.\n\n" +
    "Open {site}/orders, put in your number and that PIN, and every order you " +
    "have placed is there.",
  ready:
    "Hi {name}, your food is here. Bringing it to {hostel} now.",
  late:
    "Hi {name}, the {batch} run is running a little behind.\n\n" +
    "Your food is coming. I will message again when it is with you.",
};

/** Everything a template can say, so the admin can rearrange the wording. */
export const TEMPLATE_TOKENS: { token: string; means: string }[] = [
  { token: "{name}", means: "who the bag is for" },
  { token: "{ref}", means: "the order number, like #1042" },
  { token: "{batch}", means: "Wednesday night, and so on" },
  { token: "{total}", means: "what they owe" },
  { token: "{hostel}", means: "their hostel or block" },
  { token: "{window}", means: "when the run lands" },
  { token: "{link}", means: "their order page" },
  { token: "{site}", means: "the site address" },
  { token: "{pin}", means: "their four-digit PIN" },
  { token: "{pin_line}", means: "a whole sentence giving them their PIN" },
  { token: "{bank}", means: "your account details and the narration to use" },
  { token: "{card_link}", means: "the card link saved on that order" },
];

/** The line a paid customer reads on their order page, until it is rewritten. */
export const PAID_NOTE_DEFAULT =
  "We deliver to {hostel}, {window}. You will be called when we are outside.";

/** Fills the same tokens into a short note that is not a whole message. */
export function fillNote(
  text: string,
  values: { hostel: string; window: string; ref: string; name: string }
): string {
  return Object.entries({
    "{hostel}": values.hostel,
    "{window}": values.window,
    "{ref}": values.ref,
    "{name}": values.name,
  }).reduce((filled, [token, value]) => filled.split(token).join(value), text);
}

type TemplateOrder = {
  id: string;
  order_no: number | null;
  customer_name: string;
  customer_phone: string;
  for_name: string | null;
  total: number;
  hostel: string;
  payment_link?: string | null;
};

/**
 * Every message the admin ever sends. Nothing is sent by a robot: she taps a
 * template, WhatsApp opens with the words already in it, and she presses send
 * herself. The wording is hers to edit in settings; these are only defaults.
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
  const custom = String(settings[TEMPLATE_FIELD[args.kind]] ?? "").trim();
  const body = custom || TEMPLATE_DEFAULT[args.kind];

  const bank =
    settings.bank_name && settings.bank_account_number
      ? `${settings.bank_account_name} ${settings.bank_account_number} ` +
        `(${settings.bank_name}). Put ${order.customer_phone} as the narration.`
      : "Message me for the account details.";

  const values: Record<string, string> = {
    "{name}": order.for_name ?? order.customer_name,
    "{ref}": orderRef(order),
    "{batch}": batchLabel,
    "{total}": naira(order.total),
    "{hostel}": order.hostel,
    "{window}": args.deliveryWindow,
    "{link}": `${siteUrl}/o/${order.id}`,
    "{site}": siteUrl,
    "{pin}": pin ?? "----",
    "{pin_line}": pin
      ? `Your PIN is ${pin}. Every order you place: ${siteUrl}/orders`
      : "",
    "{bank}": bank,
    "{card_link}": order.payment_link || "(link coming in the next message)",
  };

  return Object.entries(values)
    .reduce((text, [token, value]) => text.split(token).join(value), body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
