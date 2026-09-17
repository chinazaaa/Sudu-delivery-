import { naira, orderRef, shareRef } from "./money";
import { externalUrl, type Settings } from "./settings";

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
  { token: "{narration}", means: "what to type in the transfer, like 1042" },
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

/**
 * The promoter's own nudge, sent to somebody who ordered and did not pay.
 *
 * It is theirs to change: the person sending it knows how they talk to the
 * people they brought in, and a message that reads like a form letter does
 * not get answered. The tokens below are the only moving parts.
 */
export const NUDGE_DEFAULT =
  "Hi {name}, your Sudu order for {batch} is in but not paid for yet. " +
  "Pay before the cut off and it goes on the run.\n\n" +
  "Your order ({total}): {link}";

/** What a nudge can say. Fewer than a whole message needs. */
export const NUDGE_TOKENS: { token: string; means: string }[] = [
  { token: "{name}", means: "who ordered" },
  { token: "{batch}", means: "Thursday night, and so on" },
  { token: "{total}", means: "what they owe" },
  { token: "{link}", means: "their order page, where they pay" },
];

/** Fills a nudge in. Anything unknown is left alone rather than blanked. */
export function fillNudge(
  text: string,
  values: { name: string; batch: string; total: string; link: string }
): string {
  return text
    .replaceAll("{name}", values.name)
    .replaceAll("{batch}", values.batch)
    .replaceAll("{total}", values.total)
    .replaceAll("{link}", values.link)
    .trim();
}

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
  /** The other orders in this one's group, when it is part of one. */
  groupOrders?: { id: string; order_no: number | null }[];
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
/**
 * What to type in the transfer's narration. The order number is four digits
 * and belongs to one order, so it matches the payment without ambiguity; a
 * phone number is eleven digits and covers every order that person places.
 */
export function narration(
  order: { order_no: number | null; id: string },
  group?: { order_no: number | null; id: string }[]
): string {
  const ref = group && group.length > 1 ? shareRef(order, group) : orderRef(order);
  return ref.replace("#", "");
}

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
        `(${settings.bank_name}). Put ${narration(order)} as the narration.`
      : "Message me for the account details.";

  const values: Record<string, string> = {
    "{name}": order.for_name ?? order.customer_name,
    "{ref}": shareRef(order, order.groupOrders ?? []),
    "{narration}": narration(order, order.groupOrders),
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
    // With its scheme, so WhatsApp makes it tappable rather than plain text.
    "{card_link}":
      externalUrl(order.payment_link) ?? "(link coming in the next message)",
  };

  return Object.entries(values)
    .reduce((text, [token, value]) => text.split(token).join(value), body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
