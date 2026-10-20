import { shortRef } from "./links";
import { naira, orderRef, shareRef } from "./money";
import { externalUrl, googleLinks, type Settings } from "./settings";

/**
 * What to call somebody in a message.
 *
 * "Hi Amieghe Kayla" is nobody's idea of how a person is addressed, so the
 * templates greet by first name. The catch is that the first word is not
 * reliably the first name: names arrive written both ways round, and
 * greeting somebody by their surname is worse than greeting them by both.
 *
 * So `called` is whatever the shop has set for this person in the customer
 * book, and the first word is only the guess used until somebody says
 * otherwise. A name with nothing in it at all falls back to "there", which
 * reads as a greeting rather than as a gap where a name should be.
 */
export function firstName(full: string, called = ""): string {
  const set = String(called ?? "").trim();
  if (set !== "") return set;

  const said = String(full ?? "").trim();
  if (said === "") return "there";
  return said.split(/\s+/)[0];
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
  | "landed"
  | "late"
  | "review"
  | "google"
  | "google_payer"
  | "parents"
  | "basket";

export const TEMPLATE_LABEL: Record<TemplateKind, string> = {
  confirmed: "Payment confirmed",
  payment: "Ask for payment",
  card: "Send card link",
  pin: "Send their PIN",
  ready: "Food is here",
  landed: "Tell the payer it landed",
  late: "Running late",
  review: "Ask for a review",
  google: "Ask for a Google review",
  google_payer: "Ask the parent for a review",
  parents: "Tell them about Sudu for parents",
  basket: "Their basket, priced up",
};

/** What was ordered, in one word. The shop sells three things now. */
export type Ordered = "food" | "order" | "parcel";

/**
 * The button's wording, which follows what was actually ordered.
 *
 * "Food is here" over somebody's cleanser, or over a dress being carried
 * from Lekki, is the food shop's wording on an order that is not food.
 */
export function templateLabel(kind: TemplateKind, what: Ordered): string {
  if (kind !== "ready") return TEMPLATE_LABEL[kind];
  return what === "food"
    ? "Food is here"
    : what === "parcel"
      ? "Parcel is here"
      : "Order is here";
}

/** Which settings field holds the admin's own wording for each template. */
export const TEMPLATE_FIELD: Record<TemplateKind, keyof Settings> = {
  confirmed: "msg_confirmed",
  payment: "msg_payment",
  card: "msg_card",
  pin: "msg_pin",
  ready: "msg_ready",
  landed: "msg_landed",
  late: "msg_late",
  review: "msg_review",
  google: "msg_google",
  google_payer: "msg_google_payer",
  parents: "msg_parents",
  basket: "msg_basket",
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
  /*
   * A basket somebody left, priced up and sent back to them.
   *
   * Said the way a customer would say it rather than the way the shop
   * talks to itself. Nobody outside this building knows what a run is, or
   * a car of its own, or why Lekki is different from Sangotedo, and a
   * message that opens with any of that reads as an excuse. What they want
   * to know is what is in it, what it costs, and when it turns up.
   *
   * It ends on a question on purpose. The basket was abandoned once
   * already, so the message that revives it should invite a reply rather
   * than only a transfer, and "anything else" is how a two item order
   * becomes a four item one.
   */
  basket:
    "Hi {name}, I have put your basket together for you.\n\n" +
    "{items}\n\n" +
    "Total: {total}\n\n" +
    "It comes {window}, to {hostel}.\n\n" +
    "{bank}\n\n" +
    "Send me the receipt once you have paid. Anything else you fancy before " +
    "I head out?\n\nYour order: {link}",
  card:
    "Hi {name}, here is the card link for your {batch} order ({total}):\n\n" +
    "{card_link}\n\nYour order: {link}",
  pin:
    "Hi {name}, here is your Sudu PIN: {pin}.\n\n" +
    "Open {site}/orders, put in your number and that PIN, and every order you " +
    "have placed is there.",
  ready:
    "Hi {name}, your {thing} is here. Bringing it to {hostel} now.",
  /*
   * For whoever paid, when that is not whoever ate.
   *
   * A father orders from Lagos for a son in a hostel. The son is told the
   * food is here, because he is the one who has to come down for it, and
   * the man who paid for it hears nothing at all and is left wondering
   * whether any of it arrived. This is the one message that exists only
   * because a household has two people in it, which is why it is offered
   * only when it does.
   */
  landed:
    "Hi {name}, {for}'s {thing} has been delivered.\n\nThe order: {link}",
  late:
    "Hi {name}, the {batch} run is running a little behind.\n\n" +
    "Your {thing} is coming. I will message again when it is with you.",
  review:
    "Hi {name}, hope {ordered} was good. If you have a second, say how it was " +
    "on your order page: {link}{google_line}\n\nIt takes one tap and it helps a lot.",
  // The public one, sent down the customer list rather than against an
  // order. It names no order and no run on purpose: it goes to somebody
  // who ordered a while ago as readily as to somebody who ate last night.
  google:
    "Hi {name}, hope {ordered} was good.\n\n" +
    "If you have a minute, a review on Google helps us more than anything " +
    "else: {google}\n\nThank you.",
  /*
   * The same ask, of the one who paid for it.
   *
   * A father in Lagos and a son in a hostel are two people with two
   * opinions, and two reviews is the point rather than one. His is not a
   * review of how the food tasted, because he did not eat it: it is a
   * review of a shop that took his money four hundred kilometres away and
   * got a box to his son, which is the thing another parent reading
   * Google wants to know about.
   */
  google_payer:
    "Hi {name}, hope {for} enjoyed the {thing}.\n\n" +
    "If you have a minute, a word on Google about how ordering for " +
    "{for} went helps us more than anything else: {google}\n\n" +
    "Thank you.",
  /*
   * News, not a favour.
   *
   * This one is sent down the customer list to students, and what it is
   * really asking for is a forward to somebody at home. That only happens
   * if it reads as something worth passing on rather than as a shop asking
   * for an introduction, so it announces a thing and leaves the forwarding
   * to them.
   *
   * It says nothing about who pays. A student at this university may well
   * be paying for their own food, and a message that assumes otherwise is
   * a message that lands badly with exactly the people worth keeping.
   */
  parents:
    "Hi {name}, Sudu here. Hope the last one was good.\n\n" +
    "We have just started monthly boxes and parcel pickups for parents:\n" +
    "{site}/parents?utm_source=whatsapp\n\n" +
    "If your folks would want it, feel free to send it on.",
};

/** Everything a template can say, so the admin can rearrange the wording. */
export const TEMPLATE_TOKENS: { token: string; means: string }[] = [
  { token: "{name}", means: "who the bag is for" },
  { token: "{ref}", means: "the order number, like #1042" },
  { token: "{narration}", means: "what to type in the transfer, like 1042" },
  { token: "{batch}", means: "Wednesday night, and so on" },
  { token: "{total}", means: "what they owe" },
  { token: "{hostel}", means: "their hostel or block" },
  { token: "{thing}", means: "food, order or parcel, whichever it is" },
  {
    token: "{for}",
    means: "who the order is for, where that is somebody else, like a son",
  },
  {
    token: "{ordered}",
    means: 'what they actually got, like "the KFC". "the last one" where it is not known',
  },
  {
    token: "{items}",
    means: "every line of the order, one per line, with what each comes to",
  },
  { token: "{window}", means: "when the run lands" },
  { token: "{link}", means: "their order page" },
  { token: "{site}", means: "the site address" },
  { token: "{pin}", means: "their four-digit PIN" },
  { token: "{pin_line}", means: "a whole sentence giving them their PIN" },
  { token: "{bank}", means: "your account details and the narration to use" },
  { token: "{card_link}", means: "the card link saved on that order" },
  { token: "{google}", means: "your Google review link, on its own" },
  {
    token: "{google_line}",
    means: "a whole sentence asking them to review you on Google",
  },
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
  /** What the shop calls this person, where somebody has said. Empty means
   *  the first word of their name. */
  callsThem?: string;
  customer_phone: string;
  for_name: string | null;
  total: number;
  hostel: string;
  payment_link?: string | null;
  /** Where it was fetched from, so a message can name the thing rather
   *  than calling it "the last one", and what is actually in it, so a
   *  message can read the basket back. */
  lines?: {
    restaurant?: string | null;
    qty?: number;
    name?: string;
    unit_price_at_order?: number;
    choices?: string[];
  }[];
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

/**
 * The basket read back, a line each.
 *
 * For the one message that exists because somebody did not finish: they
 * filled a basket days ago and are being asked to pay for it now, so it has
 * to say what is in it before it says what it costs. "The KFC" does not
 * settle an argument about whether the sausage was on there.
 *
 * Nothing is said about money per line unless the price is known, because a
 * list of names with one price missing reads as a mistake rather than as a
 * gap.
 */
function itemsList(lines: TemplateOrder["lines"]): string {
  const rows = (lines ?? []).filter((line) => (line.name ?? "") !== "");
  if (rows.length === 0) return "";

  return rows
    .map((line) => {
      const qty = line.qty && line.qty > 1 ? `${line.qty}x ` : "";
      const where = line.restaurant ? ` (${line.restaurant})` : "";
      const extras =
        line.choices && line.choices.length > 0
          ? ` with ${line.choices.join(", ")}`
          : "";
      const money =
        typeof line.unit_price_at_order === "number" && line.unit_price_at_order > 0
          ? ` - ${naira(line.unit_price_at_order * (line.qty ?? 1))}`
          : "";
      return `${qty}${line.name}${extras}${where}${money}`;
    })
    .join("\n");
}

/**
 * What to call the thing somebody ordered, in a sentence.
 *
 * The counters it came from, because that is what anybody remembers: not
 * "my order of the fourteenth" but the KFC. Falls back to "the last one"
 * rather than to nothing, so a message is never left with a hole in it.
 */
function orderedWas(lines: { restaurant?: string | null }[] | undefined): string {
  const names = [
    ...new Set(
      (lines ?? [])
        .map((line) => String(line.restaurant ?? "").trim())
        .filter((name) => name !== "")
    ),
  ];
  if (names.length === 0) return "the last one";
  if (names.length === 1) return `the ${names[0]}`;
  return `the ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function template(args: {
  kind: TemplateKind;
  order: TemplateOrder;
  settings: Settings;
  pin: string | null;
  siteUrl: string;
  batchLabel: string;
  deliveryWindow: string;
  /** What was ordered, for the one word that changes between the shops. */
  what?: Ordered;
  /** The account to quote. Without one, the single account in settings. */
  bank?: { bank_name: string; account_name: string; account_number: string } | null;
  /*
   * Who this message is being opened to, where that is not the person the
   * order is filed under.
   *
   * A household has two phones. "Your food is here" goes to the son and
   * opened "Hi Austin", because the name came off the order and the order
   * is the father's. The caller knows which of the two it is about to
   * message, so it says, and the greeting follows the phone.
   */
  toName?: string;
  /** Who the order is for, for a message to the other one about them. */
  aboutName?: string;
}): string {
  const { order, settings, pin, siteUrl, batchLabel } = args;
  const custom = String(settings[TEMPLATE_FIELD[args.kind]] ?? "").trim();
  const body = custom || TEMPLATE_DEFAULT[args.kind];

  // One account in a message, whatever else is on the list. Three of them in
  // a WhatsApp message is a wall to read on a phone; the order page carries
  // the rest, one tap apart.
  const account = args.bank ?? {
    bank_name: settings.bank_name,
    account_name: settings.bank_account_name,
    account_number: settings.bank_account_number,
  };

  const bank =
    account.bank_name && account.account_number
      ? `${account.account_name} ${account.account_number} ` +
        // Asterisks are how WhatsApp renders bold, so the one thing they must
        // type stands out in a message they are reading on a phone.
        `(${account.bank_name}). Put *${narration(order)}* as the narration.`
      : "Message me for the account details.";

  const values: Record<string, string> = {
    // First name, and the shop's own answer for this person where it has
    // one. A message that opens with somebody's full name reads like a
    // letter from a bank.
    "{name}":
      String(args.toName ?? "").trim() ||
      firstName(order.for_name ?? order.customer_name, order.callsThem),
    // Them, not whoever is reading it. Empty on an ordinary order, where
    // there is only one person and the sentence would say their own name
    // back to them.
    "{for}":
      String(args.aboutName ?? "").trim() ||
      firstName(order.for_name ?? order.customer_name, order.callsThem),
    "{ref}": shareRef(order, order.groupOrders ?? []),
    "{narration}": narration(order, order.groupOrders),
    "{batch}": batchLabel,
    "{total}": naira(order.total),
    "{hostel}": order.hostel,
    "{thing}": args.what ?? "food",
    /*
     * What they actually got, for a message that asks how it was.
     *
     * "Hope the last one was good" is a sentence anybody could send about
     * anything, and it reads as one. "Hope the KFC was good" is the shop
     * remembering. It is not a script: naming the thing jogs somebody's
     * memory and leaves the words to them, which is the only kind of
     * review worth having and the only kind people will write.
     */
    "{ordered}": orderedWas(order.lines),
    "{items}": itemsList(order.lines),
    "{window}": args.deliveryWindow,
    "{link}": `${siteUrl}/o/${shortRef(order)}`,
    // The one place a review is worth asking for is the moment somebody has
    // just been handed their food. Empty until the shop sets the link, and
    // the whole sentence goes with it rather than leaving "or on Google:"
    // dangling at the end of a message.
    "{google}": googleLinks(settings).review,
    "{google_line}": googleLinks(settings).review
      ? `\n\nOr leave us a review on Google, which helps more than anything: ${googleLinks(settings).review}`
      : "",
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

/**
 * The same templates, to a person rather than about an order.
 *
 * Two of these messages are not about anything somebody bought. "Here is
 * your PIN" and "would you leave us a review on Google" are addressed to a
 * customer, and the customers list is exactly where you would send them
 * from: it is the page with the person on it, and no order in sight.
 *
 * It used to borrow template() with an order invented on the spot, which
 * worked right up until template() read a field the invention did not have
 * and the whole page died with it. template() fills every token whether the
 * message uses it or not, so an order has to be a real one.
 *
 * This fills only what a person has: their name, the links, their PIN. Any
 * token that needs an order is removed rather than left standing, because
 * the wording is editable and somebody will eventually put {ref} in a
 * message that has no ref. An empty space in a sentence beats sending
 * somebody a brace.
 */
export function templateFor(args: {
  kind: TemplateKind;
  /** Their name as the shop has it, and what the shop calls them where
   *  that is different. */
  name: string;
  callsThem?: string;
  settings: Settings;
  pin?: string | null;
  siteUrl: string;
  what?: Ordered;
}): string {
  const { settings, siteUrl } = args;
  const custom = String(settings[TEMPLATE_FIELD[args.kind]] ?? "").trim();
  const body = custom || TEMPLATE_DEFAULT[args.kind];
  const review = googleLinks(settings).review;

  const values: Record<string, string> = {
    "{name}": firstName(args.name, args.callsThem),
    "{google}": review,
    "{google_line}": review
      ? `\n\nOr leave us a review on Google, which helps more than anything: ${review}`
      : "",
    "{site}": siteUrl,
    "{link}": `${siteUrl}/orders`,
    "{thing}": args.what ?? "food",
    // Sent down the customer list rather than against an order, so there
    // is nothing to name.
    "{ordered}": "the last one",
    "{items}": "",
    "{pin}": args.pin ?? "----",
    "{pin_line}": args.pin
      ? `Your PIN is ${args.pin}. Every order you place: ${siteUrl}/orders`
      : "",
  };

  return Object.entries(values)
    .reduce((text, [token, value]) => text.split(token).join(value), body)
    // Whatever is left wanted an order. Out it comes.
    .replace(/\{[a-z_]+\}/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
