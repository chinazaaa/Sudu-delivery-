import { db } from "./supabase";
import { parseBands, SAME_DAY_BANDS, URGENT_EXTRA, type Band } from "./fees";
import { DELIVERY_WINDOWS, type BatchSlot } from "./config";

/**
 * The slider the home page builds for itself, in the words it uses today.
 *
 * Admin shows these rather than an empty box, so what you are editing is
 * what is on the site rather than a guess at it.
 */
export const AUTO_HEADLINE = "{restaurant}, delivered to your block";

export const AUTO_LINES = [
  "One payment. Food and delivery together, before the car leaves.",
  "Mix restaurants in one cart and pay one delivery fee.",
  "Wrong or missing item? Money back the same night.",
].join("\n");

export type Settings = {
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp_number: string;
  card_note: string;
  instagram_handle: string;
  whatsapp_group_link: string;
  pitch_line: string;
  product_notes: string;
  footer_line: string;
  /** Editable WhatsApp templates. Blank means "use the wording below". */
  msg_confirmed: string;
  msg_payment: string;
  msg_card: string;
  msg_pin: string;
  msg_ready: string;
  msg_late: string;
  /** What a paid customer reads on their order page. */
  paid_note: string;
  /** The delivery price list as JSON. Blank means the shipped bands. */
  fee_bands: string;
  /** Who to email when something needs a person. One address per line. */
  admin_emails: string;
  /** Minutes a cart sits untouched before it counts as abandoned. */
  abandon_minutes: number;
  /** What customers are told about when each run lands. */
  window_afternoon: string;
  window_night: string;
  /** How many days ahead a customer may order into. */
  order_horizon_days: number;
  /** The line under the name in the header. */
  tagline: string;
  /** Whether the footer offers the promoter sign in. Blank means it does. */
  hide_promoter_link: string;
  /** Hides the footer outright, line and links together. */
  hide_footer: string;
  /**
   * The strip along the top of every page: a claim, a return, a notice. One
   * line, kept short on purpose. Empty means no strip at all.
   */
  ribbon_text: string;
  /** Same day delivery is on today, or it is not. "on" or empty. */
  same_day_on: string;
  /** The same day price ladder, as JSON, so it can be changed without a
   *  deploy. Empty means the built in one. */
  same_day_bands: string;
  /** What being inside the five hours adds, on every step. */
  same_day_urgent_extra: string;
  /**
   * A discount code to announce beside it. The strip reads the code itself
   * for what it is worth and who it is for, and says nothing while the code
   * is off, expired or used up.
   */
  offer_code: string;
  /**
   * The slider the home page builds when there are no slides of your own.
   * The headline is per restaurant, and the lines rotate beneath it.
   */
  auto_headline: string;
  auto_lines: string;
};

/** Every setting at its default, which is also what a missing row reads as. */
export const EMPTY: Settings = {
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  whatsapp_number: "",
  card_note: "",
  instagram_handle: "",
  whatsapp_group_link: "",
  pitch_line: "",
  product_notes: "",
  footer_line: "",
  msg_confirmed: "",
  msg_payment: "",
  msg_card: "",
  msg_pin: "",
  msg_ready: "",
  msg_late: "",
  paid_note: "",
  fee_bands: "",
  admin_emails: "",
  abandon_minutes: 45,
  window_afternoon: "",
  window_night: "",
  order_horizon_days: 7,
  tagline: "",
  hide_promoter_link: "",
  hide_footer: "",
  ribbon_text: "",
  same_day_on: "",
  same_day_bands: "",
  same_day_urgent_extra: "",
  offer_code: "",
  auto_headline: "",
  auto_lines: "",
};

export async function getSettings(): Promise<Settings> {
  // Every column, rather than a list of them. Naming each one means that
  // adding a setting to the code and forgetting to add the column makes the
  // whole row come back empty, and every setting on the site quietly reverts
  // to its default. One missing column should cost one setting, not all of
  // them.
  const { data, error } = await db()
    .from("settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return { ...EMPTY, ...((data ?? {}) as Partial<Settings>) };
}

export async function safeSettings(): Promise<Settings> {
  try {
    return await getSettings();
  } catch {
    return EMPTY;
  }
}


/**
 * wa.me wants international digits with no plus and no spaces, so a number
 * typed the Nigerian way (0803…) has to be rewritten.
 */
export function whatsappLink(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const international = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

/** "@sudu.ng" or "sudu.ng" both work; the link needs it bare. */
export function instagramLink(handle: string): string | null {
  const name = handle.trim().replace(/^@/, "");
  return name ? `https://instagram.com/${encodeURIComponent(name)}` : null;
}

/** The product page notes, one per line, with {restaurant} filled in. */
export function productNotes(settings: Settings, restaurant: string): string[] {
  return settings.product_notes
    .split("\n")
    .map((line) => line.trim().replaceAll("{restaurant}", restaurant))
    .filter(Boolean);
}

/** The delivery bands in force right now, read once per request. */
export async function activeBands(): Promise<Band[]> {
  return parseBands((await safeSettings()).fee_bands);
}

/** The pick-a-time ladder, and what urgency adds to every step of it. */
export async function sameDayPricing(): Promise<{ bands: Band[]; urgentExtra: number }> {
  const settings = await safeSettings();
  return {
    bands: settings.same_day_bands ? parseBands(settings.same_day_bands) : SAME_DAY_BANDS,
    urgentExtra: Number(settings.same_day_urgent_extra) || URGENT_EXTRA,
  };
}

/** The delivery window for a slot: the admin's wording, else the shipped one. */
export async function deliveryWindows(): Promise<Record<BatchSlot, string>> {
  const settings = await safeSettings();
  return {
    afternoon: settings.window_afternoon.trim() || DELIVERY_WINDOWS.afternoon,
    night: settings.window_night.trim() || DELIVERY_WINDOWS.night,
  };
}

/**
 * A link somebody pasted, made safe to put in an href. Without a scheme the
 * browser reads it as a path, so "paystack.com/pay/x" became a link to
 * /o/<order>/paystack.com/pay/x. Anything that is not http or https is
 * rejected outright rather than rendered as a link.
 */
export function externalUrl(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
