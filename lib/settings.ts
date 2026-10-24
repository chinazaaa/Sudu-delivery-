import { cache } from "react";

import { db } from "./supabase";
import { waLink } from "./whatsapp";
import {
  parseBands,
  FIRST_DELIVERY_HOUR,
  GROUP_FLOOR,
  LAST_DELIVERY_HOUR,
  RUN_LAST_HOUR,
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
  x_handle: string;
  contact_email: string;
  /**
   * Whether a payment alert may mark its own order paid.
   *
   * "on" and the inbox does it, where exactly one unpaid order matches the
   * amount exactly. Anything else and it stays a suggestion for a person,
   * which is how it has always worked. A forged alert cannot put money in
   * the account, but it can put food in a car, so this is a switch rather
   * than a given, and it is off until somebody turns it on.
   */
  auto_paid: string;
  /** Whether the ordering chat appears on the shop at all. Off until
   *  somebody turns it on, so it can be built in the open. */
  bot_on: string;
  /** The product the chat offers as a handwritten card. One product, called
   *  whatever the occasion makes it. Empty means no card is offered. */
  card_item_id: string;
  /** The App Store id, digits only. Empty means the site never mentions an
   *  iPhone app: no bar in Safari, no link in the footer. */
  ios_app_id: string;
  /** The Play Store package name, like store.sudu.app. Empty the same way:
   *  nothing on the site says there is an Android app. */
  android_package: string;
  /** "on" where somebody abroad can choose to pay in pounds or dollars.
   *  The card link is a Stripe one, sent by hand as every card link is. */
  abroad_on: string;
  /** Naira to one pound and to one dollar, as the shop will honour them.
   *  Empty shows no figure at all rather than a wrong one. */
  gbp_rate: string;
  usd_rate: string;
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
  msg_landed: string;
  msg_late: string;
  msg_review: string;
  msg_google: string;
  msg_google_payer: string;
  msg_parents: string;
  msg_basket: string;
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
  /** Where the strip takes somebody. Empty leaves it as plain text. */
  ribbon_href: string;
  /** Same day delivery is on today, or it is not. "on" or empty. */
  same_day_on: string;
  /** The menu item that is the bag of ice block, added to any order
   *  holding something that has to travel on ice. Empty until the shop
   *  says which item it is, and then nothing is ever added. */
  ice_item_id: string;
  /** The same day price ladder, as JSON, so it can be changed without a
   *  deploy. Empty means the built in one. */
  same_day_bands: string;
  /** What being inside the five hours adds, on every step. */
  same_day_urgent_extra: string;
  /** The least one person in a group pays towards the car. */
  group_fee_floor: string;
  /** The aisles the whole shop is browsed by, one per line, in order. */
  menu_aisles: string;
  /** Every standing plan held at once, for the holidays. A date, or empty. */
  plans_paused_until: string;
  /** How many days before it lands a plan's order is raised. */
  plan_lead_days: string;
  /** The first and last hour of the day a delivery can be asked for, in Lagos
   *  time, as 24 hour numbers. Empty means noon and six. */
  same_day_first_hour: string;
  /** Per weekday hours as JSON, where a day differs from the pair above. */
  same_day_day_hours: string;
  same_day_last_hour: string;
  /** The latest a shared run ever delivers, as an hour of the Lagos clock.
   *  Not the same number as the one above: a car going out for one person
   *  stops earlier than the last run of the day. */
  run_last_hour: string;
  /**
   * A discount code to announce beside it. The strip reads the code itself
   * for what it is worth and who it is for, and says nothing while the code
   * is off, expired or used up.
   */
  offer_code: string;
  /**
   * The coupon a promoter's own link carries: open sudu.store/s/ada and it
   * applies itself at the checkout.
   *
   * The name of a code rather than an amount, so what it is worth, who it is
   * for and how long it runs are all on the coupons page with every other
   * offer. Empty means a link brings nothing but the promoter's name.
   */
  promoter_perk_code: string;
  /**
   * The slider the home page builds when there are no slides of your own.
   * The headline is per restaurant, and the lines rotate beneath it.
   */
  auto_headline: string;
  auto_lines: string;
  /** The order of the buckets on the front page, and which of them are off.
   *  Empty means the order the shop shipped with. */
  home_order: string;
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
  /** The pharmacy counter, in the same shape as skincare above: a shop of
   *  its own, on its own car, with its own ladder. Its own columns rather
   *  than a share of skincare's, so closing one does not close the other. */
  pharmacy_on: string;
  pharmacy_fee: number;
  pharmacy_day: number;
  pharmacy_cut_off: string;
  pharmacy_window: string;
  pharmacy_blurb: string;
  pharmacy_bands: string;
  pharmacy_promise: string;
  /** The laundry service: whether it is on, what we add to the going rate,
   *  the basket worth sending a car for, and a line of our own. The rate
   *  list itself is in the code; only what we add to it lives here. */
  laundry_on: string;
  laundry_markup: number;
  /** Per cent added to a counter's price to get the menu price. What a
   *  line is expected to cost is its price without this on, which is the
   *  figure the person at the till needs. A counter can store its own. */
  food_markup: number;
  laundry_minimum: number;
  laundry_note: string;
  /** Which weekdays the laundry car goes, Sunday 0, as "1,4". */
  laundry_days: string;
  /** When on a collection day we come, and when it comes back. Windows
   *  rather than times, because the round of blocks is not ordered until
   *  the list closes. Empty and the page says neither. */
  laundry_window: string;
  laundry_back: string;
  /** What a collection on any other day costs on top. Zero means we do
   *  not go on another day at all. */
  laundry_other_day: number;
  /** When each page of small print last said something different, as the
   *  shop typed it. Empty means the page says what it is instead. */
  /** The shop's Google Business Profile, and the link that opens straight
   *  onto the write-a-review box. Empty means neither is offered. The
   *  review link falls back to the profile, because somebody can leave one
   *  from there too. */
  google_profile: string;
  google_review: string;
  /** What the profile says, typed in by the shop. Zero and empty mean the
   *  pages show no rating and no quotes at all, only the button. */
  google_rating: number;
  google_reviews: number;
  /** Real reviews copied word for word, as JSON. Nothing else. */
  google_quotes: string;
  /** The Google tag id, so Merchant Center can be told when somebody buys.
   *  Empty means no Google script loads anywhere on the site, which is how
   *  it shipped. */
  google_tag: string;
  terms_updated: string;
  privacy_updated: string;
  returns_updated: string;
  /** Carrying one person's Secret Santa gifts: what it costs, how many
   *  things that covers, and what each one past that adds. One giver's
   *  gifts go to one person on one day, so it is charged once against that
   *  giver however many things they chose. Zero costs nothing. */
  santa_delivery: number;
  santa_delivery_included: number;
  santa_delivery_extra: number;
  /** The areas the shop delivers from, as JSON. Empty means one area, and
   *  every price exactly as it was. */
  delivery_areas: string;
  area_pairs: string;
  /** What a round trip to each set of areas costs the shop, as JSON. The
   *  money that goes on the card alongside the counters' own. Empty is a
   *  shop that has not typed any fares in, and then the run sheet says so
   *  rather than guessing. */
  transport_fares: string;
  /** Which season the site is dressed for. Empty is the ordinary shop. */
  season: string;
  /** Which admin notifications to stop sending, by kind. Empty is all of
   *  them, which is what it has always been. */
  email_mute: string;
  /** Carrying a parcel: on or off, the routes and their prices as JSON, the
   *  most a parcel may be worth, and what the shop says before it takes one.
   *  A parcel is its own trip, so it has no ladder and no run. */
  parcel_on: string;
  parcel_routes: string;
  parcel_max_value: number;
  parcel_blurb: string;
  parcel_terms: string;
};

/** Every setting at its default, which is also what a missing row reads as. */
export const EMPTY: Settings = {
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  whatsapp_number: "",
  card_note: "",
  instagram_handle: "",
  x_handle: "",
  contact_email: "hello@sudu.store",
  auto_paid: "",
  bot_on: "",
  card_item_id: "",
  ios_app_id: "",
  android_package: "",
  abroad_on: "",
  gbp_rate: "",
  usd_rate: "",
  whatsapp_group_link: "",
  pitch_line: "",
  product_notes: "",
  footer_line: "",
  msg_confirmed: "",
  msg_payment: "",
  msg_card: "",
  msg_pin: "",
  msg_ready: "",
  msg_landed: "",
  msg_late: "",
  msg_review: "",
  msg_google: "",
  msg_google_payer: "",
  msg_parents: "",
  msg_basket: "",
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
  ribbon_href: "",
  same_day_on: "",
  ice_item_id: "",
  same_day_bands: "",
  same_day_urgent_extra: "",
  group_fee_floor: "",
  menu_aisles: "",
  plans_paused_until: "",
  plan_lead_days: "",
  same_day_first_hour: "",
  same_day_day_hours: "",
  same_day_last_hour: "",
  run_last_hour: "",
  offer_code: "",
  promoter_perk_code: "",
  auto_headline: "",
  auto_lines: "",
  home_order: "",
  skincare_on: "",
  skincare_fee: 0,
  skincare_day: 6,
  skincare_cut_off: "08:00",
  skincare_window: "",
  skincare_blurb: "",
  skincare_bands: "",
  skincare_promise: "",
  pharmacy_on: "",
  pharmacy_fee: 0,
  pharmacy_day: 6,
  pharmacy_cut_off: "08:00",
  pharmacy_window: "",
  pharmacy_blurb: "",
  pharmacy_bands: "",
  pharmacy_promise: "",
  laundry_on: "",
  laundry_markup: 0,
  food_markup: 15,
  laundry_minimum: 0,
  laundry_note: "",
  laundry_days: "1,4",
  laundry_window: "",
  laundry_back: "",
  laundry_other_day: 0,
  google_profile: "",
  google_review: "",
  google_rating: 0,
  google_reviews: 0,
  google_quotes: "",
  google_tag: "",
  terms_updated: "",
  privacy_updated: "",
  returns_updated: "",
  santa_delivery: 0,
  santa_delivery_included: 3,
  santa_delivery_extra: 0,
  delivery_areas: "",
  area_pairs: "",
  transport_fares: "",
  season: "",
  email_mute: "",
  parcel_on: "",
  parcel_routes: "",
  parcel_max_value: 50000,
  parcel_blurb: "",
  parcel_terms: "",
};

/**
 * The shop's settings, read once per request however often they are asked
 * for.
 *
 * A hundred and two places in the code ask for these, and a single page
 * render asks a dozen times: the fee bands want them, so do the areas, the
 * opening hours, the bank details, the WhatsApp number and the chat. Every
 * one of those was its own round trip to the database, and on a page that
 * asks ten times that is ten waits for one unchanging row.
 *
 * React's cache gives one answer per request. Not a time cache and not a
 * stale one: the first caller fetches, everybody else in that same render
 * gets the same promise, and the next request starts again. So editing a
 * setting still takes effect on the very next page load, which is the
 * whole reason these are read live rather than baked in.
 */
export const getSettings = cache(async function getSettings(): Promise<Settings> {
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
});

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
/**
 * Where to send somebody to leave a review, and where to send them to look
 * the shop up. The review link falls back to the profile, because a profile
 * page has a review button on it and one link set is better than a button
 * that does nothing.
 *
 * Only http(s), because these go into a page as links and a setting is
 * whatever somebody typed into it.
 */
/**
 * The Google tag id, if one that could be real has been typed in.
 *
 * Google hands out several prefixes for what is the same script: G- for a
 * tag made in Analytics, AW- for one made in Ads, and MC- or a bare number
 * from Merchant Center. Which one is right is whichever was printed on the
 * setup screen, so this checks the shape rather than the prefix: a stray
 * sentence in the box must not become a script tag on every page.
 */
export function googleTagId(settings: { google_tag?: string }): string {
  const said = String(settings.google_tag ?? "").trim();
  return /^[A-Z]{1,4}-[A-Z0-9]{6,20}$/i.test(said) || /^\d{8,12}$/.test(said)
    ? said
    : "";
}

export function googleLinks(settings: {
  google_profile?: string;
  google_review?: string;
}): { profile: string; review: string } {
  const safe = (said: string | undefined): string => {
    const text = String(said ?? "").trim();
    return /^https?:\/\//i.test(text) ? text : "";
  };
  const profile = safe(settings.google_profile);
  return { profile, review: safe(settings.google_review) || profile };
}

/** One review, as the shop pasted it. */
export type GoogleQuote = {
  said: string;
  who: string;
  /** How many stars they left, 1 to 5. Five where none was recorded. */
  stars: number;
  /** Where it sits on the band. Higher goes first; zero means unplaced. */
  rank: number;
};

/**
 * The quotes, parsed.
 *
 * Anything that is not a list of {said, who} reads as none, because a
 * half-parsed review is a made-up review and this is the one part of the
 * site where that is unforgivable.
 */
export function googleQuotes(json: string | null | undefined): GoogleQuote[] {
  try {
    const raw = JSON.parse(String(json ?? "") || "[]") as GoogleQuote[];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((one) => ({
        said: String(one?.said ?? "").trim(),
        who: String(one?.who ?? "").trim(),
        // Written long after the first reviews were pasted in, so a quote
        // without it is one of those: five, which is what they all were.
        stars: Math.min(5, Math.max(1, Math.round(Number(one?.stars) || 5))),
        rank: Math.max(0, Math.round(Number(one?.rank) || 0)),
      }))
      .filter((one) => one.said !== "");
  } catch {
    return [];
  }
}

/** The same link a form builds in the browser, for the pages that build
 *  one on the server. One implementation, in lib/whatsapp. */
export const whatsappLink = waLink;

/**
 * "@sudu.ng", "sudu.ng" or the whole address, all three.
 *
 * It took the handle bare and encoded whatever it was given, so the
 * address somebody copies out of their own address bar came back as
 * instagram.com/https%3A%2F%2Fwww.instagram.com%2Fsudustore. That is what
 * was in the footer: a link to nothing, from a field that looked right in
 * admin. Pasting a profile address is the reasonable thing to do, so it
 * works.
 */
export function instagramLink(handle: string): string | null {
  const name = bareHandle(handle, /^https?:\/\/(www\.)?instagram\.com\//i);
  return name ? `https://instagram.com/${encodeURIComponent(name)}` : null;
}

/** The shop's addresses: the one that is written down, and its neighbours. */
export type ShopEmails = {
  hello: string;
  support: string;
  orders: string;
  privacy: string;
  terms: string;
};

/**
 * Five addresses from one.
 *
 * A page about returns should say orders@ and a page about data should say
 * privacy@, because an address that says what it is for is read by a
 * person before it is read by a mailbox. Written as five settings they
 * would be five chances for four of them to still carry the old domain the
 * day the shop moves, so only the first is typed and the rest are its
 * neighbours.
 *
 * Nothing at all where no address is set: a mailto: to nowhere is worse
 * than a page that only offers WhatsApp.
 */
export function shopEmails(said: string | null | undefined): ShopEmails | null {
  const hello = String(said ?? "").trim().toLowerCase();
  const at = hello.lastIndexOf("@");
  if (at < 1 || at === hello.length - 1) return null;

  const domain = hello.slice(at + 1);
  const beside = (name: string) => `${name}@${domain}`;
  return {
    hello,
    support: beside("support"),
    orders: beside("orders"),
    privacy: beside("privacy"),
    terms: beside("terms"),
  };
}

/** A handle out of whatever was typed: an address, an @, or the name. */
function bareHandle(said: string, site: RegExp): string {
  return said
    .trim()
    .replace(site, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .trim();
}

/**
 * The same for X, which is also still twitter.com to half the people who
 * will paste a handle in here.
 *
 * A whole address pasted in works too: somebody copying their own profile
 * from the address bar has done the reasonable thing, and rejecting it
 * because it was not bare would be the site being pedantic at them.
 */
export function xLink(handle: string): string | null {
  const name = bareHandle(handle, /^https?:\/\/(www\.)?(x|twitter)\.com\//i);
  return name ? `https://x.com/${encodeURIComponent(name)}` : null;
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
 * The least one person in a group pays towards the car.
 *
 * Read here rather than reached for in the fee maths, which knows nothing
 * about settings and should not: the floor is a decision about margin, and
 * decisions about margin belong where somebody can change them without a
 * deploy.
 */
export async function groupFloor(): Promise<number> {
  return numberOr((await safeSettings()).group_fee_floor, GROUP_FLOOR);
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

/**
 * The latest a shared run ever delivers, as an hour of the Lagos clock.
 *
 * What holding an empty run open is measured back from. Seven unless admin
 * says otherwise, which is what the runs actually do: the same-day hour is
 * two hours earlier and is about a car going out for one person, so the two
 * cannot share a number.
 */
export async function runLastHour(): Promise<number> {
  const settings = await safeSettings();
  const hour = numberOr(settings.run_last_hour, RUN_LAST_HOUR);
  return hour >= 1 && hour <= 23 ? hour : RUN_LAST_HOUR;
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
