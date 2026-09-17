import { db } from "./supabase";
import { parseBands, type Band } from "./fees";
import { DELIVERY_WINDOWS, type BatchSlot } from "./config";

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
};

const EMPTY: Settings = {
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
};

export async function getSettings(): Promise<Settings> {
  const { data } = await db()
    .from("settings")
    .select(
      "bank_name, bank_account_name, bank_account_number, whatsapp_number, card_note, " +
        "instagram_handle, whatsapp_group_link, pitch_line, product_notes, footer_line, " +
        "msg_confirmed, msg_payment, msg_card, msg_pin, msg_ready, msg_late, paid_note, " +
        "fee_bands, admin_emails, abandon_minutes, window_afternoon, window_night, " +
        "order_horizon_days"
    )
    .eq("id", true)
    .maybeSingle();
  return { ...EMPTY, ...((data ?? {}) as Partial<Settings>) };
}

/**
 * Settings for chrome that must render even when nothing is configured yet,
 * such as the footer on the not-found page during a build with no environment.
 */
export async function safeSettings(): Promise<Settings> {
  try {
    return await getSettings();
  } catch {
    return EMPTY;
  }
}

export function hasBankDetails(settings: Settings): boolean {
  return Boolean(settings.bank_name && settings.bank_account_number);
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

/** The delivery window for a slot: the admin's wording, else the shipped one. */
export async function deliveryWindows(): Promise<Record<BatchSlot, string>> {
  const settings = await safeSettings();
  return {
    afternoon: settings.window_afternoon.trim() || DELIVERY_WINDOWS.afternoon,
    night: settings.window_night.trim() || DELIVERY_WINDOWS.night,
  };
}
