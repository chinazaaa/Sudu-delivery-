import { db } from "./supabase";
import {
  parseBands,
  FIRST_DELIVERY_HOUR,
  LAST_DELIVERY_HOUR,
  SAME_DAY_BANDS,
  URGENT_EXTRA,
  type Band,
} from "./fees";
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
  msg_review: string;
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
  /** The same two windows as times rather than as a sentence, "12:00" and
   *  "17:30". What the customer reads is built from these, so a run's hours
   *  are a fact the shop can reason about rather than words it has to parse.
   *  Empty falls back to whatever the sentence above says. */
  window_afternoon_from: string;
  window_afternoon_to: string;
  window_night_from: string;
  window_night_to: string;
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
  /** The first and last hour of the day a delivery can be asked for, in Lagos
   *  time, as 24 hour numbers. Empty means noon and six. */
  same_day_first_hour: string;
  /** Per weekday hours as JSON, where a day differs from the pair above. */
  same_day_day_hours: string;
  same_day_last_hour: string;
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
  /** The skincare shop: on or off, what delivery costs on one of its orders,
   *  which day the car goes and when it stops taking orders that morning. */
  skincare_on: string;
  skincare_fee: number;
  skincare_day: number;
  skincare_cut_off: string;
  skincare_window: string;
  skincare_blurb: string;
  /** The skincare delivery ladder, as JSON. Empty means the flat fee. */
  skincare_bands: string;
  /** Where the products come from, in the shop's own words. Empty falls back
   *  to the line in the code, so this reads right before anybody sets it. */
  skincare_promise: string;
  /** The areas the shop delivers from, as JSON. Empty means one area, and
   *  every price exactly as it was. */
  delivery_areas: string;
  /** Which admin notifications to stop sending, by kind. Empty is all of
   *  them, which is what it has always been. */
  email_mute: string;
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
  msg_review: "",
  paid_note: "",
  fee_bands: "",
  admin_emails: "",
  abandon_minutes: 45,
  window_afternoon: "",
  window_night: "",
  window_afternoon_from: "",
  window_afternoon_to: "",
  window_night_from: "",
  window_night_to: "",
  order_horizon_days: 7,
  tagline: "",
  hide_promoter_link: "",
  hide_footer: "",
  ribbon_text: "",
  same_day_on: "",
  same_day_bands: "",
  same_day_urgent_extra: "",
  same_day_first_hour: "",
  same_day_day_hours: "",
  same_day_last_hour: "",
  offer_code: "",
  auto_headline: "",
  auto_lines: "",
  skincare_on: "",
  skincare_fee: 0,
  skincare_day: 6,
  skincare_cut_off: "08:00",
  skincare_window: "",
  skincare_blurb: "",
  skincare_bands: "",
  skincare_promise: "",
  delivery_areas: "",
  email_mute: "",
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
    urgentExtra: numberOr(settings.same_day_urgent_extra, URGENT_EXTRA),
  };
}

/**
 * The hours of the day a delivery can be asked for.
 *
 * Kept here rather than in the code so that deciding to run later one evening
 * is a change of mind rather than a deploy, and so nothing anywhere has to
 * say "after six" in words that would then be wrong.
 */
/**
 * A number out of a setting, where zero is an answer.
 *
 * `Number(x) || fallback` reads as "use the setting unless it is missing",
 * and means "use the setting unless it is missing or zero". The surcharge
 * for a car leaving within the hour was set to nothing and silently became
 * two thousand again, so an order for one shawarma was charged eight and a
 * half where the ladder said six and a half. Blank and nonsense fall back;
 * zero is what somebody typed and is kept.
 */
export function numberOr(raw: unknown, fallback: number): number {
  const text = String(raw ?? "").trim();
  if (text === "") return fallback;
  const value = Number(text);
  return Number.isFinite(value) ? value : fallback;
}

export async function deliveryHours(): Promise<{ first: number; last: number }> {
  const settings = await safeSettings();
  const first = numberOr(settings.same_day_first_hour, FIRST_DELIVERY_HOUR);
  const last = numberOr(settings.same_day_last_hour, LAST_DELIVERY_HOUR);
  return first < last ? { first, last } : { first: FIRST_DELIVERY_HOUR, last: LAST_DELIVERY_HOUR };
}

export type DayHours = { first: number; last: number; off?: boolean };

/**
 * The hours for each weekday, where a day is not like the rest of the week.
 *
 * Saturday and Wednesday are not the same business. A day nobody has touched
 * falls back to the single pair, so a shop that never opens this works
 * exactly as it did, and a day marked off offers nothing at all.
 */
export async function hoursByDay(): Promise<(weekday: number) => DayHours> {
  const base = await deliveryHours();
  const settings = await safeSettings();

  let byDay: Record<string, DayHours> = {};
  try {
    const raw = (settings.same_day_day_hours ?? "").trim();
    if (raw.startsWith("{")) byDay = JSON.parse(raw) as Record<string, DayHours>;
  } catch {
    // A row nobody can read is a week on the ordinary hours, not a broken
    // shop.
  }

  return (weekday: number) => {
    const day = byDay[String(weekday)];
    if (!day) return base;
    if (day.off) return { first: 0, last: 0, off: true };

    const first = Number(day.first);
    const last = Number(day.last);
    return Number.isFinite(first) && Number.isFinite(last) && first < last
      ? { first, last }
      : base;
  };
}

/**
 * The widest the week ever opens, for anything that lists the windows on
 * offer rather than pricing one day.
 */
export async function hoursSpan(): Promise<{ first: number; last: number }> {
  const forDay = await hoursByDay();
  const week = [0, 1, 2, 3, 4, 5, 6].map(forDay).filter((day) => !day.off);
  if (week.length === 0) return deliveryHours();

  return {
    first: Math.min(...week.map((day) => day.first)),
    last: Math.max(...week.map((day) => day.last)),
  };
}

/** The delivery window for a slot: the admin's wording, else the shipped one. */
export async function deliveryWindows(): Promise<Record<BatchSlot, string>> {
  const settings = await safeSettings();
  return {
    afternoon:
      sayWindow(settings.window_afternoon_from, settings.window_afternoon_to) ||
      settings.window_afternoon.trim() ||
      DELIVERY_WINDOWS.afternoon,
    night:
      sayWindow(settings.window_night_from, settings.window_night_to) ||
      settings.window_night.trim() ||
      DELIVERY_WINDOWS.night,
  };
}

/** The hours each kind of run delivers in, for anything that has to compare
 *  them rather than print them. Absent where nobody has set them. */
export async function windowTimes(): Promise<
  Record<BatchSlot, { from: string; to: string } | null>
> {
  const settings = await safeSettings();
  const pair = (from: string, to: string) =>
    from.trim() !== "" && to.trim() !== "" ? { from: from.trim(), to: to.trim() } : null;
  return {
    afternoon: pair(settings.window_afternoon_from, settings.window_afternoon_to),
    night: pair(settings.window_night_from, settings.window_night_to),
  };
}

/**
 * Two times as the sentence a customer reads: "Between 12pm and 5:30pm".
 *
 * The window used to be typed out by hand, which meant the shop knew what it
 * had promised only as words. Times can be compared, so a same day window
 * that a run already covers can be left out of the list rather than guessed
 * at from a sentence.
 */
export function sayWindow(from: string, to: string): string {
  const said = (time: string): string | null => {
    const [hours, minutes] = time.split(":").map((one) => Number(one));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    const suffix = hours >= 12 ? "pm" : "am";
    const shown = hours % 12 === 0 ? 12 : hours % 12;
    return minutes === 0 ? `${shown}${suffix}` : `${shown}:${String(minutes).padStart(2, "0")}${suffix}`;
  };

  const start = said(from);
  const end = said(to);
  return start && end ? `Between ${start} and ${end}` : "";
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
