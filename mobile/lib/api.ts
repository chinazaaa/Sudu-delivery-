import Constants from "expo-constants";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { InteractionManager } from "react-native";
import { dressFor } from "@/lib/theme";

import { me } from "./store";

/**
 * Everything the app knows comes from the shop's own server.
 *
 * The menu, the prices, what delivery costs, whether a run is still open: all
 * of it is read through here. The app never talks to the database, so a
 * change made in admin shows up in the app the moment it is saved, and a
 * phone cannot be taken apart to find a key that reads customers.
 */
export const BASE =
  (Constants.expoConfig?.extra as { api?: string } | undefined)?.api ?? "https://sudu.store";

/**
 * What a customer is told when the request never leaves the phone.
 *
 * A failed fetch arrives as whatever the platform felt like saying, and iOS
 * says things like "UnexpectedException: A server with the specified hostname
 * could not be found (at ExpoModulesCore/Promise.swift:56)". Somebody on
 * campus wifi with a login page they have not signed into saw that, on the
 * front page of a shop, where a sentence would have done.
 */
const NO_REACH = "No connection. Check your internet and pull down to try again.";

/** Like fetch, but a broken connection is a sentence rather than a stack. */
async function reach(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(NO_REACH);
  }
}

/**
 * The body, or a sentence.
 *
 * A wifi login page answers every request with its own HTML and a cheerful
 * 200, so reading it as JSON throws somewhere nobody expected. That is the
 * same problem as no connection at all, and reads better said that way.
 */
async function body<T>(response: Response): Promise<T & { error?: string }> {
  try {
    return (await response.json()) as T & { error?: string };
  } catch {
    if (!response.ok) throw new Error("The shop is having a moment. Try again shortly.");
    throw new Error(NO_REACH);
  }
}

/**
 * What a customer is told when the phone's sign-in is no longer good.
 *
 * Said as a fact about the phone rather than as a failure, because that is
 * what it is: nothing has gone wrong with their account, their orders or
 * their money, and the next tap fixes it.
 */
export const SIGN_IN_AGAIN = "This phone needs signing in again. Your PIN is all it takes.";

/**
 * A sign-in that no longer verifies, dropped where it is noticed.
 *
 * The app carried a signed token and threw a plain error on any failed
 * request, so when the shop changed the key that signs them, every stored
 * token quietly became wrong and the app told people to sign in again
 * without showing them the door. The only way out was Account, sign out,
 * sign in, which is a thing nobody finds.
 *
 * So a 401 clears the token here, in the one place every signed-in request
 * passes through. The screens already send somebody to sign in when there
 * is no token, so dropping it is the whole fix: the next render offers the
 * sign in rather than an error about one.
 *
 * Never on a request that carried no token. An endpoint answering 401 to an
 * anonymous call is saying this needs signing in, not that what the phone
 * holds is stale, and clearing nothing is the right amount of damage.
 */
async function dropDeadToken(response: Response, token?: string | null): Promise<void> {
  if (response.status !== 401 || !token) return;
  try {
    // Only this phone's own stale token. A request that raced a sign-in
    // would otherwise clear the good token the sign-in had just written.
    if ((await me.read()).token === token) await me.save({ token: null });
  } catch {
    /* Storage is not worth an error on top of an error. The request still
       fails and still says so; the phone simply asks again next time. */
  }
}

async function get<T>(path: string, token?: string | null): Promise<T> {
  const response = await reach(`${BASE}/api/app${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const said = await body<T>(response);
  if (!response.ok) {
    await dropDeadToken(response, token);
    throw new Error(
      response.status === 401 ? SIGN_IN_AGAIN : said.error ?? "Something went wrong."
    );
  }
  return said;
}

/**
 * The shared delivery routes, which live outside /api/app because the website
 * uses them too. The seat goes in a header: a browser holds it in a cookie it
 * cannot read, and the app holds it itself.
 */
async function party<T>(
  path: string,
  seat: string | null,
  data?: unknown
): Promise<T> {
  const response = await reach(`${BASE}/api/party${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(seat ? { "x-sudu-seat": seat } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const said = await body<T>(response);
  if (!response.ok) throw new Error(said.error ?? "Something went wrong.");
  return said;
}

async function post<T>(path: string, data: unknown, token?: string | null): Promise<T> {
  const response = await reach(`${BASE}/api/app${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const said = await body<T>(response);
  if (!response.ok) {
    await dropDeadToken(response, token);
    throw new Error(
      response.status === 401 ? SIGN_IN_AGAIN : said.error ?? "Something went wrong."
    );
  }
  return said;
}

/**
 * Something told to the server that nobody is waiting on: a screen was looked
 * at, a cart was left. It never throws and never returns anything, because
 * there is nothing a customer could do about it if it failed.
 */
async function beacon(path: string, data: unknown): Promise<void> {
  try {
    await fetch(`${BASE}/api/app${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    /* No signal, or the shop is down. Neither is worth telling anybody. */
  }
}

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  restaurantId: string;
  restaurant: string;
  slug: string;
  categoryId: string | null;
  category: string;
};

export type BoxLineView = {
  id: string;
  name: string;
  restaurant: string;
  choices: string[];
  qty: number;
  total: number;
  swaps: { name: string; restaurant: string; choices: string[]; delta: number }[];
};

export type BoxView = {
  id: string;
  name: string;
  blurb: string;
  serves: string;
  imageUrl: string;
  isExtra: boolean;
  lines: BoxLineView[];
  /** What the food comes to as the shop packed it. A swap moves it by its
   *  own delta, which the app can do without asking again. */
  food: number;
  runFee: number;
  carFee: number;
  /** What to suggest in "want it changed?" for this box. Empty falls back to
   *  the shelf's, because two boxes on one shelf want different advice. */
  customHint?: string;
};

export type WhenOption = {
  key: string;
  runId: string;
  at: string;
  date: string;
  day: string;
  window: string;
  onARun: boolean;
  fee: number;
};

export type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
  categoryId: string | null;
  /** How much of the car it takes, as a percentage of one container. A
   *  drink is 25, four making one. Missing on an older shop, which reads
   *  as a whole container and prices as it always did. */
  containerPct?: number;
  groups: {
    id: string;
    name: string;
    required: boolean;
    maxSelect: number;
    options: { id: string; name: string; priceDelta: number; available?: boolean }[];
  }[];
};

export type Place = {
  restaurant: { id: string; name: string; logoUrl: string; bannerUrl: string };
  categories: { id: string; name: string }[];
  items: Item[];
};

/** A shared delivery as everybody in it sees it. */
export type GroupBoard = {
  started: boolean;
  id?: string;
  short?: string | null;
  leader?: string;
  when?: string;
  sameDay?: boolean;
  people?: number;
  names?: string[];
  ready?: number;
  closed?: boolean;
  closesAt?: string;
  /** What delivery would cost each of them if it closed now. */
  eachNow?: number;
  /** Whether this phone is the one that made the link. Worked out by the
   *  server from the seat, because every member holds the group id and a
   *  client asking itself said yes to everybody. */
  leaderIsMine?: boolean;
  /** Named when a promotion is pricing the car, because then the figure does
   *  not fall as people join and a board implying it will is a surprise
   *  waiting at the close. */
  offer?: string;
  members?: {
    isMine: boolean;
    name: string;
    items: number;
    food: number;
    summary: string;
    ready: boolean;
    finalised: boolean;
    changed: boolean;
  }[];
  /** This browser's own seat, and nobody else's. */
  mine?: {
    phone: string;
    hostel: string;
    note: string;
    paymentMethod: "transfer" | "card";
  } | null;
};

export type Run = {
  id: string;
  label: string;
  cutOffISO: string;
  deliveryWindow: string;
  flashFee: number | null;
  /** The day it goes, so a run today can be told from one tomorrow without
   *  reading the label. Older servers leave it out. */
  runDate?: string;
  /** Where this car goes beyond Sangotedo, as "|lekki|". It always passes
   *  Sangotedo, so empty means there and nowhere else. */
  areas?: string;
  /** The only counters this run stops at, as "|id|id|". Empty means all of
   *  them, which is what a run is unless somebody says otherwise. */
  onlyPlaces?: string;
  /** Shut, or has as many orders as it can carry. Older servers leave both
   *  out, and then a run is offered and the order itself refuses it. */
  closed?: boolean;
  full?: boolean;
  /** Closed but not shopped yet: still taking orders, from the counters
   *  it has not been to, at a car's fee rather than a run's, and with a
   *  clock on it. Older servers leave it out, which reads as an ordinary
   *  run, which is what every run was before this existed. */
  lastMinute?: boolean;
};

/**
 * The one promotion worth interrupting somebody for.
 *
 * The same shape the website's card reads, so both say the offer the same
 * way. Null where nothing automatic is on, which is most days.
 */
export type Nudge = {
  /** Only ever a key for remembering a dismissal; never shown. */
  code: string;
  badge: string;
  where: string;
  detail: string;
  go: { label: string; href: string }[];
};

/** A time somebody can ask for, as the shop's own clock works it out. */
export type Slot = {
  at: string;
  /** "Between 12pm and 3pm", as it reads at the top of the list. */
  label: string;
  /** The same thing inside a sentence: "get it between 12pm and 3pm". Older
   *  servers do not send it, so anything reading it falls back to the label. */
  phrase?: string;
  /** Just the hours, no day on the end: "between 4pm and 7pm". What a car
   *  of its own promises, the same as a run. Older servers do not send it,
   *  so anything reading it falls back to the label. */
  window?: string;
  /** Past tomorrow a day is named by its date rather than counted, because
   *  "in six days" is not how anybody says Saturday. */
  day: "today" | "tomorrow" | "later";
  /** The day it lands on, so one further out than tomorrow can be named.
   *  Older servers do not send it. */
  date?: string;
  /** Under five hours away, which costs more because the car cannot wait. */
  urgent: boolean;
};

/** The four doors on the home screen, answered with the menu. */
export type Doors = {
  skincare: { on: boolean; when: string };
  pharmacy: { on: boolean; when: string };
  parcels: { on: boolean; places: string[] };
  shelves: {
    slug: string;
    name: string;
    from: number | null;
    kind: string;
    image: string;
  }[];
};

export type Shop = {
  menu: Place[];
  /*
   * The doors, in the same answer as the menu.
   *
   * The home screen used to ask for each of these itself, and each one
   * filled in its own strip of the page as it landed: the page assembled
   * itself in front of somebody, one section at a time. Missing where the
   * server is older than this, and then the screen asks the old way.
   */
  doors?: Doors | null;
  /** The blocks admin delivers to. Empty means the list is not set up, and
   *  the checkout falls back to a typed answer exactly as the website does. */
  hostels?: string[];
  runs: Run[];
  bands: { maxItems: number | null; fee: number }[];
  /** Picking a time rather than waiting for a run. No slots means the shop
   *  has it switched off, and runs are the only way. */
  sameDay?: {
    slots: Slot[];
    bands: { maxItems: number | null; fee: number }[];
    urgentExtra: number;
  };
  shop: {
    tagline: string;
    /** Which season the shop is dressed for. Empty is the ordinary shop,
     *  and so is an older server that does not send it at all. */
    season?: string;
    /** The strip along the top, written in admin. Empty means nothing to
     *  announce and no strip at all. */
    ribbon: string;
    /** Where it takes them, already translated into a screen this app has.
     *  Empty leaves the strip as words rather than a door. */
    ribbonTo?: string;
    whatsapp: string;
    /** Where to leave us a review on Google. Both empty where admin has put
     *  no link in, and then the app never asks for one. */
    google?: { profile: string; review: string };
  };
  /** Who somebody could say they heard about the shop from. Empty means
   *  nobody is promoting, and the question is not worth asking. */
  promoters?: { code: string; name: string }[];
  /** The currencies a card link can be made out in, for somebody abroad
   *  paying. Older servers send none, and then the question is not asked. */
  monies?: { code: string; label: string; symbol: string; rate: number }[];
  /** The bag of ice block that goes with ice cream, and the items that
   *  need one. The shop puts it in the cart and takes it out again; it is
   *  never offered and never removed by hand. Absent on an older server,
   *  which is a shop that does not do this. */
  ice?: {
    itemId: string;
    name: string;
    restaurantId: string;
    restaurantName: string;
    imageUrl: string;
    unitPrice: number;
    containerPct: number;
  } | null;
  needsIce?: string[];
  /** The order of the front page, as admin set it, and what is switched off.
   *  Older servers send none, and then the app keeps the order it shipped
   *  with, which is the same one the website ships with. */
  homeOrder?: (
    | "food"
    | "shelves"
    | "parcel"
    | "skincare"
    | "pharmacy"
    | "custom"
    | "group"
  )[];
  /** The things the shop does that are not a shelf: laundry, printing, a
   *  tailor. Sent by the server rather than built in, so a new one appears
   *  without waiting on a release. Absent on older servers, and then the
   *  app simply does not mention them, which is what it did before. */
  services?: { slug: string; title: string; lead: string; url: string }[];
  /** Today's automatic offer, for the card in the corner. Null or absent
   *  means nothing is on, which is most days. */
  nudge?: Nudge | null;
  /** The areas the shop delivers from, beyond Sangotedo, and which one each
   *  kitchen is in. Older servers send neither, and then everything is
   *  Sangotedo and every price is what it always was. */
  areas?: Area[];
  areaOf?: Record<string, string>;
  /** What a stop between each two areas costs. Older servers send none,
   *  and then every stop falls back to the one figure below. */
  areaPairs?: AreaPair[];
  /** The kitchens that price by what the shopping comes to rather than by
   *  how many things it is. A market is one; a restaurant is not. */
  valueBandsOf?: Record<string, ValueBand[]>;
  /** The things priced by the cool box rather than by the container, by
   *  item. Absent on an older server, which is everything on the ordinary
   *  ladder, which is how it worked before. */
  stepFeeOf?: Record<string, StepFee>;
  /** What is on at each kitchen, by restaurant id: a few words for the card,
   *  a sentence for the top of its menu, and the list behind the button. */
  offers?: Record<
    string,
    {
      badge: string;
      line: string;
      deals: { title: string; detail: string; code?: string }[];
    }
  >;
};

export type OrderView = {
  id: string;
  ref: string;
  status: string;
  stage: string;
  /** The run it is on, so it can be left out of the ones offered instead. */
  runId?: string;
  /** Whether this run can still take money. False once the shopping has
   *  started, and then asking for a transfer is asking for a refund. */
  payable: boolean;
  total: number;
  food: number;
  fee: number;
  discount: number;
  /** The code that took the discount off, when one was typed. */
  couponCode: string | null;
  paymentMethod: string;
  paymentLink: string | null;
  narration: string;
  hostel: string;
  /** What they said about it last time, if they have answered. */
  rating?: number | null;
  feedback?: string;
  /** Whether they have already left us a Google review. Older servers send
   *  nothing, and then the ask behaves as it always did. */
  reviewedUs?: boolean;
  run: {
    sameDay?: boolean;
    label: string;
    cutOffISO: string;
    window: string;
    /** Which shop it came from. Older servers leave it out, and then it is a
     *  run, which is what everything was before the others existed. */
    kind?: string;
    /** A parcel has no day until the shop has agreed one. */
    agreed?: boolean;
  };
  /** A parcel rather than food: what is carried and between where. Null on
   *  every ordinary order. */
  parcel?: {
    route: string;
    item: string;
    shop: string;
    from: string;
    to: string;
    kg: number;
  } | null;
  lines: { name: string; restaurant: string; qty: number; choices: string[]; unitPrice: number }[];
  accounts: { bank: string; name: string; number: string }[];
};

/**
 * The whole menu is a quarter of a megabyte and takes a couple of seconds to
 * arrive, and every screen wants it. Fetching it again on each move between
 * screens is what made opening one feel like waiting, so it is held for a
 * minute. Pulling down asks for it fresh.
 */
let held: { at: number; shop: Shop } | null = null;
/** The fetch already in the air, so several screens share one. */
let coming: Promise<Shop> | null = null;
const HELD_FOR = 60_000;

/**
 * And the same thing again on disk, for the cold start.
 *
 * The copy above lives as long as the app does, which is no help at all to
 * somebody opening it from nothing: the front page had to draw its doors
 * against no menu at all, then jolt as the banner arrived a second or two
 * later. A phone that has been here before already knows what the shop
 * looked like, so it draws that first and corrects itself when the real
 * answer lands.
 *
 * A day is the outside limit. Prices and runs move, and a menu older than
 * that is not worth showing even for the second before the real one lands.
 */
const KEPT_KEY = "sudu.shop.kept";

/**
 * File the shop for next time, off the frame that is drawing it.
 *
 * It is well over a megabyte, and turning that into a string is work done
 * on the same thread as the screen. Done the moment the menu arrives, it
 * was a stutter at exactly the moment somebody was looking at the new
 * food. The screen wants the menu, not the receipt for having filed it, so
 * the filing waits until the screen has finished with the thread.
 */
function keep(shop: Shop): void {
  InteractionManager.runAfterInteractions(() => {
    try {
      void AsyncStorage.setItem(
        KEPT_KEY,
        JSON.stringify({ at: Date.now(), shop })
      ).catch(() => {});
    } catch {
      // A phone with no room left still has the menu in memory.
    }
  });
}
const KEPT_FOR = 24 * 60 * 60 * 1000;

/**
 * Yesterday's runs, taken out.
 *
 * Whether a run is closed is worked out by the server when it answers, so a
 * held copy carries an opinion that was true when it was fetched. On a copy
 * off the disk that opinion can be hours old, and a front page promising a
 * run that shut at six is worse than one that says nothing. The cut-off is
 * a time rather than an opinion, so it still means what it says.
 */
function stillGoing(shop: Shop): Shop {
  /*
   * Dressed for the season on the way past.
   *
   * Every shop object the app ever holds comes through here, so this is
   * the one place that cannot be forgotten. The website has recoloured
   * itself off this setting since it went in and the app wore the ordinary
   * red whatever it said, so switching Halloween on gave pumpkins on the
   * site and the plain shop on the phone.
   */
  dressFor(shop.shop?.season);

  const now = Date.now();
  return {
    ...shop,
    runs: (shop.runs ?? []).filter((one) => {
      const shuts = new Date(one.cutOffISO).getTime();
      return Number.isFinite(shuts) ? shuts > now : true;
    }),
  };
}

/**
 * What this run of the app already has in memory, without touching the disk.
 *
 * The whole shop is well over a megabyte of JSON, and reading the kept copy
 * means parsing all of it. Every screen asks for the shop when it mounts, so
 * moving between two tabs was parsing a megabyte off the disk twice for a
 * menu already sitting in a variable. Nothing is read, nothing is parsed,
 * and the screen draws on the frame it mounted in.
 */
export function heldShop(): Shop | null {
  return held === null || Date.now() - held.at >= KEPT_FOR
    ? null
    : stillGoing(held.shop);
}

/** What the phone saw last time, if it is recent enough to be worth drawing. */
export async function keptShop(): Promise<Shop | null> {
  // Already in hand, so there is nothing to read and nothing to parse.
  const inHand = heldShop();
  if (inHand) return inHand;

  try {
    const raw = await AsyncStorage.getItem(KEPT_KEY);
    if (!raw) return null;
    const kept = JSON.parse(raw) as { at: number; shop: Shop };
    if (!kept?.shop || Date.now() - kept.at > KEPT_FOR) return null;
    return stillGoing(kept.shop);
  } catch {
    // Nothing kept, or it was written by a version that shaped it
    // differently. Either way the real answer is already on its way.
    return null;
  }
}

export const api = {
  shop: async (fresh = false): Promise<Shop> => {
    if (!fresh && held !== null && Date.now() - held.at < HELD_FOR) {
      return stillGoing(held.shop);
    }
    /*
     * One request, however many screens ask.
     *
     * Every screen asks for the shop when it mounts, and opening the app
     * mounts several at once. Past the hold that was two or three fetches
     * of the same megabyte, racing each other to write the same file. They
     * share the one that is already in the air instead.
     */
    if (!fresh && coming !== null) return stillGoing(await coming);

    const asking = get<Shop>("/menu");
    if (!fresh) coming = asking;
    try {
      const shop = await asking;
      held = { at: Date.now(), shop };
      keep(shop);
      return stillGoing(shop);
    } finally {
      if (coming === asking) coming = null;
    }
  },
  signIn: (phone: string, pin: string) =>
    post<{
      token: string;
      phone: string;
      name: string;
      hostel: string;
      paymentMethod?: "transfer" | "card";
    }>("/signin", {
      phone,
      pin,
    }),
  order: (id: string) => get<OrderView>(`/order/${id}`),
  /**
   * Shared deliveries. Every one of these carries the seat, which is the only
   * thing that says who somebody is in a group: never the group id, which
   * everybody in the car holds.
   */
  group: {
    /** Start one. The answer carries the seat this phone must keep. */
    start: (body: { name: string; batchId?: string; deliverAt?: string }, seat: string | null) =>
      party<{ id: string; short: string | null; seat: string; when: string }>("", seat, body),
    /** What the board shows. First names and food only: a group link gets
     *  pasted into a chat, so anybody holding it can read this. */
    board: (id: string, seat: string | null) =>
      party<GroupBoard>(`/${id}`, seat),
    /** Take a seat, by name. Answers with the group's real id, because the
     *  way in may have been a short code and nothing else accepts one. */
    enter: (id: string, name: string, seat: string | null) =>
      party<{ ok: boolean; named: boolean; seat: string; groupId: string }>(
        `/${id}/enter`,
        seat,
        { name }
      ),
    /** Food, number, block, note and how they are paying, in one call: the
     *  website learnt the hard way that asking twice is two forms for one
     *  answer. */
    finalise: (
      id: string,
      seat: string | null,
      body: {
        lines: { menu_item_id: string; qty: number; option_ids?: string[] }[];
        phone: string;
        hostel: string;
        note: string;
        paymentMethod: "transfer" | "card";
      }
    ) => party<{ ok: boolean }>(`/${id}/finalise`, seat, body),
    /** Leaving: the seat goes with them, so the others stop paying a share. */
    leave: (groupId: string, seat: string | null) =>
      party<{ ok: boolean }>("/leave", seat, { groupId }),
    /** Close it now. Only whoever made the link, which the seat proves, and
     *  the answer carries their own order so they land on their total. */
    close: (id: string, seat: string | null) =>
      party<{ ok: boolean; share: number; people: number; orderId: string | null }>(
        `/${id}/close`,
        seat,
        {}
      ),
  },
  /** Put an order on another run. Only your own, which the token proves. */
  move: (id: string, batchId: string, token: string) =>
    post<{ ok: boolean; orderId: string }>(`/order/${id}/move`, { batchId }, token),
  /**
   * What a promotion does to this cart: the fee it sets, or the one the cart
   * nearly has and what is in the way. Asked of the shop rather than worked
   * out here, because the rules change in admin and the app ships when it
   * ships.
   */
  offerOn: (body: {
    batchId: string;
    deliverAt?: string | null;
    phone?: string;
    lines: { itemId: string; restaurantId: string; name: string; choices: string[] }[];
  }) =>
    post<{
      offer: { fee: number; note: string } | null;
      nearly: {
        fee: number;
        note: string;
        blocking: string[];
        qualifying: string[];
      } | null;
    }>("/offer", body),
  /** How a delivered order went. The id is the credential, as it is for
   *  reading the order: the link is what somebody was given. */
  rate: (orderId: string, rating: number, feedback: string) =>
    post<{ ok: boolean }>("/rate", { orderId, rating, feedback }),

  /** Asking us to find something the shop does not carry. */
  ask: (said: {
    wanted: string;
    budget: string;
    name: string;
    phone: string;
    hostel: string;
    note: string;
  }) => post<{ ok: boolean; id: string }>("/ask", said),
  /** Who an order on this run is for, so the checkout can fill itself in.
   *  The counts come back zero: delivery is charged on every order for the
   *  room its own containers take, and nothing is credited across two orders
   *  on one number. */
  adding: (batchId: string, phone: string, token?: string | null) =>
    get<{ items: number; feeCharged: number; name?: string; hostel?: string }>(
      `/adding?batchId=${encodeURIComponent(batchId)}&phone=${encodeURIComponent(phone)}`,
      token
    ),
  myOrders: (token: string) =>
    get<{
      orders: {
        id: string;
        ref: string;
        status: string;
        stage: string;
        payable: boolean;
        total: number;
        items: number;
        run: string;
      }[];
    }>(
      "/orders",
      token
    ),
  place: (order: {
    batchId: string;
    /** The time they picked, when they picked one instead of a run. */
    deliverAt?: string;
    name: string;
    phone: string;
    hostel: string;
    lines: {
      menu_item_id: string;
      qty: number;
      option_ids?: string[];
      for_name?: string | null;
    }[];
    coupon?: string;
    paymentMethod: "transfer" | "card";
    customerNote?: string;
    /** Whose money the card link is made out in. Naira unless they say. */
    payCurrency?: string;
    /** Who they say they heard about the shop from, as a promoter's code.
     *  Written once, on a first order, and theirs for life after that. */
    heardFrom?: string;
    /** Where they really heard about us, in their own words, where none of
     *  the names on the list is it. */
    heardSaid?: string;
    /** Buying it for somebody else: whose door it goes to and who we call
     *  when it is there. The buyer still pays and is still who we talk to
     *  about the money. */
    giftTo?: { name: string; phone: string };
    /** A group order: one payer, or everybody pays their own share. */
    groupMode?: "one_payer" | "split" | null;
    collectMode?: "leader" | "each";
    people?: {
      name: string;
      phone: string;
      hostel: string;
      pays?: "transfer" | "card";
    }[];
  }) => post<{ orderId: string; token: string | null }>("/order", order),
  coupon: (data: {
    code: string;
    batchId: string;
    phone: string;
    lines: { menu_item_id: string; qty: number; option_ids?: string[] }[];
  }) => post<{ discount: number; label: string }>("/coupon", data),
  again: (token: string) =>
    get<{
      lines: {
        itemId: string;
        optionIds: string[];
        name: string;
        restaurant: string;
        imageUrl: string;
        unitPrice: number;
        qty: number;
        choices: string[];
        containerPct?: number;
      }[];
      blocked: { name: string; reason: string }[];
      /** The box it came off, where it was one. A box is not a cart: its
       *  price has delivery in it already, so wanting it again means going
       *  back to the box rather than tipping its contents into a basket.
       *  Null on an ordinary order, and on older servers. */
      box?: { name: string; slug: string } | null;
      /** What they asked for last time and how they paid, so the form comes
       *  up filled in. */
      carry?: { note: string; method: "transfer" | "card" } | null;
    }>("/again", token),
  /** Everything the shop sells, a page at a time. The restaurants across
   *  the top and their own categories under them. */
  products: (asked: {
    q?: string;
    place?: string;
    category?: string;
    /** One of the shop's own aisles, for the kinds no word finds. */
    aisle?: string;
    sort?: string;
    page?: number;
  }) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(asked)) {
      if (value !== undefined && value !== "" && value !== 0) query.set(key, String(value));
    }
    const tail = query.toString();
    return get<{
      products: Product[];
      total: number;
      perPage: number;
      places: { id: string; name: string }[];
      categories: string[];
    }>(`/products${tail ? `?${tail}` : ""}`);
  },
  /** The occasions, with a price on each because a card without one is a
   *  category and categories sell nothing. */
  occasions: () =>
    get<{
      occasions: {
        slug: string;
        name: string;
        blurb: string;
        boxes: number;
        from: number | null;
        happensAt: string | null;
        whenWord: string;
        /** Which shelf it is on, so the app names them the way the site
         *  does rather than filing everything under one word. */
        kind?: "collection" | "occasion";
        image?: string;
      }[];
    }>("/occasions"),
  /** One occasion: every box drawn out, priced off today's menu by the shop,
   *  and every car it could ride. The phone never works a price out. */
  occasion: (slug: string) =>
    get<{
      occasion: {
        slug: string;
        name: string;
        blurb: string;
        happensAt: string | null;
        whenWord: string;
        kind?: "collection" | "occasion";
        image?: string;
        /** The example in the changes box, in this shelf's own words. */
        hint?: string;
        /** A shelf with a season of its own: Christmas, not foodstuff.
         *  Nobody wants a hamper again every month, so the standing order
         *  is left off rather than sitting there as a question with one
         *  sensible answer. */
        seasonal?: boolean;
        /** The last day today's prices are promised, where the shelf
         *  promises them. */
        priceHoldsUntil?: string | null;
        /** What one of these is called, singular: "hamper", "box". */
        itemWord?: string;
      };
      boxes: BoxView[];
      when: WhenOption[];
      /** The dates a box can be asked for. A collection is asked for on a
       *  day rather than put on a run, and a phone's clock is anybody's. */
      day?: { soonest: string; latest: string; timed: boolean };
      monies?: { code: string; label: string; symbol: string; rate: number }[];
      hostels: string[];
      promoters: { code: string; name: string }[];
      note: string;
    }>(`/occasions/${slug}`),
  orderBox: (data: {
    occasion: string;
    box: string;
    when: string;
    swaps: Record<string, number>;
    name: string;
    phone: string;
    hostel: string;
    paymentMethod: "transfer" | "card";
    /** Whose money the card link is made out in. Naira unless they say. */
    payCurrency?: string;
    /** "weekly", "fortnightly" or "monthly", where they want it again. */
    repeat?: string;
    repeatNote?: string;
    customerNote: string;
    heardFrom: string;
    giftName: string;
    giftPhone: string;
  }) => post<{ orderId: string; token: string | null }>("/box", data),
  /** Wipes everything that says who they are. Both stores require this to be
   *  reachable from inside the app, not only on the website. */
  deleteMe: (token: string) => post<{ ok: boolean; orders: number }>("/delete", {}, token),
  /** A cart left behind at checkout, so it can be followed up exactly as one
   *  left behind on the website is. Written only once a number is typed. */
  keepCart: (data: {
    phone: string;
    name: string;
    hostel: string;
    batchId: string;
    items: number;
    value: number;
    summary: string;
  }) => beacon("/cart", data),
  /** One screen looked at. The server decides how the app is named in the
   *  sources list, so this only says which kind of phone it is. */
  track: (path: string, visitor: string, platform: string) =>
    beacon("/track", { path, visitor, platform }),
  /** Whether this phone wants to hear about deals. Keyed on the push token,
   *  so somebody who has never ordered still has a switch. */
  prefs: (pushToken: string) => get<{ deals: boolean }>(`/prefs?token=${encodeURIComponent(pushToken)}`),
  setPrefs: (pushToken: string, deals: boolean) =>
    post<{ ok: boolean }>("/prefs", { token: pushToken, deals }),
  registerPush: (pushToken: string, platform: string, token?: string | null) =>
    post<{ ok: boolean }>("/push", { token: pushToken, platform }, token),
  /**
   * The skincare shelf, a page at a time.
   *
   * Two thousand products never come down a phone line at once: the shelf is
   * narrowed here the same way it is on the website, by shelf, by brand and
   * by price, and the answer carries the facets so the filters can be drawn
   * without a second call.
   */
  shelf: (
    query: {
      shelf?: string;
      brand?: string;
      q?: string;
      sort?: string;
      page?: number;
    } = {},
    /** Which counter's shelf. Skincare unless it says, because every
     *  screen that asked before the pharmacy existed meant skincare. */
    counter = "skincare"
  ) => {
    const asked = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "" && value !== 0) asked.set(key, String(value));
    }
    const tail = asked.toString();
    return get<Shelf>(`/${counter}${tail === "" ? "" : `?${tail}`}`);
  },
  /** A basket somebody was sent, worked out by the same code the website
   *  draws it with, so the two cannot quote different prices. */
  link: (code: string) => get<LinkView>(`/link/${encodeURIComponent(code)}`),
  placeLink: (
    code: string,
    order: {
      name: string;
      phone: string;
      hostel: string;
      note: string;
      paymentMethod: "transfer" | "card";
      instead: number;
    }
  ) =>
    post<{ orderId: string; token: string | null }>(
      `/link/${encodeURIComponent(code)}/order`,
      order
    ),
  placeShelf: (order: {
    lines: { id: string; qty: number }[];
    name: string;
    phone: string;
    hostel: string;
    note: string;
    paymentMethod: "transfer" | "card";
    /** Whoever sent them, so the order counts for somebody. */
    heardFrom?: string;
    /** Whose money the card link is made out in. Naira unless they say. */
    payCurrency?: string;
    /** A time means a car of its own rather than the weekly one. */
    deliverAt?: string;
  }, counter = "skincare") =>
    post<{ orderId: string; token: string | null }>(`/${counter}/order`, order),

  /**
   * Carrying a parcel. What the shop carries and what it charges, and a post
   * to send one.
   *
   * Every rule stays on the server: the phone draws the form and nothing
   * else, so the value cap, the weight bands and what counts as a real route
   * cannot be argued with from a phone somebody has taken apart.
   */
  parcels: () => get<ParcelSetup>("/parcel"),
  sendParcel: (parcel: {
    route: string;
    kg: number;
    wantedOn: string;
    item: string;
    shop: string;
    address: string;
    hostel: string;
    room: string;
    value: string;
    name: string;
    phone: string;
    toName: string;
    toPhone: string;
    heardFrom: string;
    note: string;
    paymentMethod: "transfer" | "card";
    /** The quote routes carry no weight. Sent as nought and ignored. */
  }) => post<{ orderId?: string; asked?: boolean }>("/parcel", parcel),
};

/** A route a parcel can travel, and what it costs by weight. */
export type ParcelRoute = {
  id: string;
  label: string;
  /** Which end is campus: one end is a block and the other is an address. */
  toPau: boolean;
  bands: { upTo: number; fee: number }[];
  /**
   * The route that asks rather than charges.
   *
   * Four towns each way covers most of what gets asked for and none of what
   * does not: a pickup in Epe, a box plainly heavier than the heaviest
   * band. That route carries no bands and no price. Picking it places
   * nothing: the details go into the list somebody already reads, and a
   * figure comes back on WhatsApp.
   *
   * Absent on an older server, which is a shop with no such route, which is
   * how it worked before.
   */
  custom?: boolean;
};

/** What the shop carries, and the rules it carries it under. */
export type ParcelSetup = {
  on: boolean;
  blurb: string;
  terms: string[];
  maxValue: number;
  /** The shop's today in Lagos, so a phone set to another day cannot offer a
   *  date that has already gone here. */
  today: string;
  hostels: string[];
  promoters: { code: string; name: string }[];
  routes: ParcelRoute[];
};

/** A product on the skincare shelf. */
export type ShelfProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  brand: string;
  available: boolean;
};

/**
 * The skincare shelf: what it is, and one page of it.
 *
 * `on` false is a real answer rather than an error. The shop can switch the
 * shelf off, and then the app simply has no skincare tab, exactly as the
 * website has no page.
 */
export type Shelf = {
  on: boolean;
  name?: string;
  /** "Saturday, 27 Sep", the whole promise in four words. */
  when?: string;
  cutOff?: string;
  window?: string;
  blurb?: string;
  /** Why the products are real, which is the thing people are right to ask. */
  promise?: string;
  bands?: { maxItems: number | null; fee: number }[];
  hostels?: string[];
  products?: ShelfProduct[];
  total?: number;
  perPage?: number;
  page?: number;
  shelves?: { name: string; items: number }[];
  brands?: { name: string; items: number }[];
  /** Times a car of its own could come, today or tomorrow. Empty where
   *  same day is off or the day has run out. */
  slots?: { at: string; label: string; day: string; urgent: boolean }[];
  sameDayBands?: { maxItems: number | null; fee: number }[];
  urgentExtra?: number;
  /** Which counter this shelf is. */
  kind?: string;
  /** Whose name to offer at the checkout, so a skincare order counts for
   *  whoever brought them in. */
  promoters?: { code: string; name: string }[];
  /** The currencies a card link can be made out in, for somebody abroad. */
  monies?: { code: string; label: string; symbol: string; rate: number }[];
};

/** Delivery is priced by how many containers travel, exactly as on the web. */
export function feeFor(items: number, bands: Shop["bands"], flashFee: number | null): number {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const band =
    ladder.find((step) => step.maxItems !== null && items <= step.maxItems) ??
    ladder[ladder.length - 1];
  if (flashFee === null) return band.fee;
  return Math.max(0, flashFee + (band.fee - ladder[0].fee));
}

/**
 * What a picked time costs: the same ladder as a run, on its own numbers, with
 * a flat extra when it is too soon for the car to be doing anything else.
 *
 * The server prices the order again when it is placed, so this is only what
 * the screen says beforehand; the two agree because the shape is the same.
 */
export function sameDayFeeFor(
  items: number,
  urgent: boolean,
  bands: Shop["bands"],
  urgentExtra: number
): number {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 6500 }];
  const band =
    ladder.find((step) => step.maxItems !== null && items <= step.maxItems) ??
    ladder[ladder.length - 1];
  return band.fee + (urgent ? urgentExtra : 0);
}

export const naira = (amount: number) => "₦" + Math.round(amount).toLocaleString("en-NG");

/**
 * Where a restaurant is, and what that adds to a delivery.
 *
 * The same shape and the same rules as the website, because the fee quoted
 * on a phone and the fee charged on the server have to be one number. The
 * ladder says how much room an order takes, which does not change with the
 * distance, so anywhere further out is the home ladder plus the petrol at
 * every band.
 */
export type Area = {
  id: string;
  name: string;
  runExtra: number;
  sameDayExtra: number;
  /** Whether a car of its own can go there. Three hours is its whole
   *  promise, and an hour each way eats that before the kitchen starts. */
  sameDay: boolean;
  /** The weekdays a car can reach it, "0,6" for Sunday and Saturday. Empty
   *  is every day. Ajah takes a car only on the day the shop is already
   *  going that way, and without this the switch was all or nothing. */
  sameDayDays?: string;
};

export const HOME: Area = {
  id: "",
  name: "Sangotedo",
  runExtra: 0,
  sameDayExtra: 0,
  sameDay: true,
};

/** Every area a cart touches. */
export function areasIn(shop: Shop | null, restaurantIds: string[]): Area[] {
  const areas = shop?.areas ?? [];
  const where = shop?.areaOf ?? {};
  const ids = [...new Set(restaurantIds.map((id) => where[id] ?? ""))];
  return ids.map((id) => areas.find((one) => one.id === id) ?? HOME);
}

/** The one that prices the order: the furthest thing in the cart, because
 *  one car fetches all of it and the trip is as long as its longest leg. */
export function dearestArea(shop: Shop | null, restaurantIds: string[]): Area {
  return areasIn(shop, restaurantIds).reduce(
    (worst, one) =>
      one.runExtra + one.sameDayExtra > worst.runExtra + worst.sameDayExtra ? one : worst,
    HOME
  );
}

/**
 * What a second stop costs, by which two places it is between.
 *
 * The dearest area says how far the car has to go. It says nothing about a
 * cart that is two errands rather than one, and a second shop is a second
 * place to find, park at, queue in and carry out of.
 *
 * Not worth the same everywhere, which is why the shop keeps a table and
 * this reads it. Two places minutes apart is one more queue; crossing the
 * town is an afternoon. Sangotedo is in the table like anywhere else: a
 * run passes it on the way back, which is why it adds nothing to the
 * distance, but somebody still has to stop the car and go into the shop.
 */
export type AreaPair = { a: string; b: string; extra: number };

/** What a shop charges for a hop nobody has priced yet. */
export const MIXED_AREA_EXTRA = 1000;

const pairKey = (a: string, b: string): string => [a, b].sort().join("\t");

export function pairExtra(
  pairs: AreaPair[],
  a: string,
  b: string,
  fallback = MIXED_AREA_EXTRA
): number {
  if (a === b) return 0;
  const want = pairKey(a, b);
  const found = pairs.find((one) => pairKey(one.a, one.b) === want);
  return Math.max(0, found ? found.extra : fallback);
}

/**
 * What the stops in this cart add, over and above the distance.
 *
 * Three or more areas is the cheapest way of joining them all up, rather
 * than every pair added together: that is the route a driver takes.
 */
export function mixedExtra(
  cartAreas: Area[],
  pairs: AreaPair[] = [],
  fallback = MIXED_AREA_EXTRA
): number {
  const ids = [...new Set(cartAreas.map((one) => one.id))];
  if (ids.length <= 1) return 0;

  const joined = new Set([ids[0]]);
  let total = 0;
  while (joined.size < ids.length) {
    let cheapest = Number.POSITIVE_INFINITY;
    let next = "";
    for (const from of joined) {
      for (const to of ids) {
        if (joined.has(to)) continue;
        const cost = pairExtra(pairs, from, to, fallback);
        if (cost < cheapest) {
          cheapest = cost;
          next = to;
        }
      }
    }
    if (!Number.isFinite(cheapest)) break;
    joined.add(next);
    total += cheapest;
  }
  return total;
}

/** The ladder as that area charges it: every band up by the same amount. */
export function withExtra(
  bands: Shop["bands"],
  extra: number
): Shop["bands"] {
  return extra <= 0 ? bands : bands.map((band) => ({ ...band, fee: band.fee + extra }));
}

/** Whether a car of its own can carry this cart at all. */
export function canGoSameDay(areas: Area[]): boolean {
  return areas.every((one) => one.sameDay);
}

/** Whether a run goes everywhere this cart needs it to. It always passes
 *  Sangotedo; anywhere else was ticked when the run was made. */
export function runCovers(run: Run, areas: Area[]): boolean {
  const covered = [
    "",
    ...(run.areas ?? "")
      .split("|")
      .map((one) => one.trim())
      .filter(Boolean),
  ];
  return areas.every((one) => covered.includes(one.id));
}

/**
 * Whether a run will fetch everything this cart draws on.
 *
 * Some nights are one counter's run: the car queues at Domino's and fetches
 * nothing else. Empty is every counter, so a run from an older server, or one
 * nobody has restricted, carries whatever it is given exactly as before.
 */
export function runCarries(run: Run, restaurantIds: string[]): boolean {
  const only = (run.onlyPlaces ?? "")
    .split("|")
    .map((one) => one.trim())
    .filter(Boolean);
  if (only.length === 0) return true;
  return restaurantIds.every((id) => only.includes(id));
}

/**
 * When an order placed now would land, decided rather than asked.
 *
 * The same order of preference as the website: a run going today while it is
 * still taking orders, a car of its own today, a run tomorrow, then
 * tomorrow's first window. There is one right answer, and the dropdown this
 * replaced only made somebody find it.
 */
export function nextArrival(
  runs: Run[],
  slots: Slot[],
  today: string
): { runId: string; at: string; said: string; onARun: boolean } | null {
  const onRun = (run: Run) => ({
    runId: run.id,
    at: "",
    said: `${lower(run.deliveryWindow)} ${run.label.split(" · ")[0]}`,
    onARun: true,
  });
  const onItsOwn = (slot: Slot) => ({
    runId: "",
    at: slot.at,
    /*
     * The window, the same as a run.
     *
     * This used to promise the hour it was aimed at, "around 4:30pm", on
     * the reasoning that a three hour block reads as a three hour wait. In
     * practice it reads as a promise to the minute, and Lagos traffic does
     * not keep one.
     *
     * The day is named rather than called "later", which is not a day
     * anybody can plan around. An older server sends neither the window nor
     * the date, so both fall back to what it does send.
     */
    said: `${slotWindow(slot)} ${slotDayWord(slot)}`,
    onARun: false,
  });

  const runToday = runs.find((one) => one.runDate === today);
  if (runToday) return onRun(runToday);

  const slotToday = slots.find((one) => one.day === "today");
  if (slotToday) return onItsOwn(slotToday);

  /*
   * Anything after today, soonest first, whichever kind it is.
   *
   * Every run was looked at before any car, so a run five days out beat a
   * car tomorrow and the app led with Wednesday while a car could have
   * been there on Monday. That is the shop's order of preference, because
   * a run is cheaper; it is not the answer to "when can I eat". A run
   * still wins a day it shares with a car: same evening, less money.
   */
  const runLater = runs.find((one) => (one.runDate ?? "") > today);
  const slotLater = slots.find((one) => one.day !== "today");
  if (runLater && slotLater) {
    const carDay = slotLater.date ?? "";
    return carDay === "" || (runLater.runDate ?? "") <= carDay
      ? onRun(runLater)
      : onItsOwn(slotLater);
  }
  if (runLater) return onRun(runLater);
  if (slotLater) return onItsOwn(slotLater);

  return runs[0] ? onRun(runs[0]) : slots[0] ? onItsOwn(slots[0]) : null;
}

export type DayOnOffer = {
  date: string;
  /** The run carrying it, or empty where a car of its own is the only way. */
  runId: string;
  /** The car window, where there is no run. Empty when a run carries it. */
  at: string;
};

/**
 * Every day this cart could arrive on, soonest first.
 *
 * A run wins its day outright: where one is going there is no reason to
 * offer a car beside it, since it arrives the same evening and costs
 * thousands less. The same rule the website uses; see lib/pick-a-day.ts.
 */
export function daysOnOffer(args: {
  runs: { id: string; runDate?: string }[];
  slots: Slot[];
}): DayOnOffer[] {
  const byDate = new Map<string, DayOnOffer>();

  for (const run of args.runs) {
    const date = (run.runDate ?? "").trim();
    if (date === "" || byDate.has(date)) continue;
    byDate.set(date, { date, runId: run.id, at: "" });
  }

  for (const slot of args.slots) {
    const date = (slot.date ?? "").trim();
    // A run already has this day. The car would be dearer and no sooner.
    if (date === "" || byDate.has(date)) continue;
    byDate.set(date, { date, runId: "", at: slot.at });
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** "Today", "Tomorrow", or "Tue 27": short, because these sit side by side
 *  in a row somebody reads across rather than down. */
export function dayShort(date: string, today: string): string {
  if (date === today) return "Today";
  const at = new Date(`${today}T12:00:00Z`);
  const next = new Date(at.getTime() + 86_400_000).toISOString().slice(0, 10);
  if (date === next) return "Tomorrow";

  const on = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(on.getTime())) return date;
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
  }).format(on);
}

/** What a car of its own promises, in hours. Falls back to the label an
 *  older server sends, lower cased so it reads inside a sentence. */
export function slotWindow(slot: Slot): string {
  const said = (slot.window ?? "").trim();
  return said !== "" ? said : lower(slot.label);
}

/** "today", "tomorrow", or the day itself where it is further out. */
export function slotDayWord(slot: Slot): string {
  if (slot.day !== "later") return slot.day;
  const date = (slot.date ?? "").trim();
  return date === "" ? "later" : `on ${daySaid(date)}`;
}

/** "Tuesday, 27 Oct", in Lagos, the way the shop writes a date. */
export function daySaid(date: string): string {
  const at = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(at);
}

/**
 * Whether a car of its own can reach everywhere this cart touches, on a
 * given day.
 *
 * One car fetches all of it, so a cart is only drivable on a day every one
 * of its areas allows. Home is always allowed: the shop is in it. The same
 * rule the website and the server both use; see lib/areas.ts.
 */
export function carGoesOn(areas: Area[], date: string): boolean {
  const away = areas.filter((one) => one.id !== "");
  if (away.length === 0) return true;
  return away.every((one) => one.sameDay && carDayAllowed(one.sameDayDays, date));
}

function carDayAllowed(text: string | null | undefined, date: string): boolean {
  if (!date) return true;
  const said = String(text ?? "")
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one !== "")
    .map(Number)
    .filter((one) => Number.isInteger(one) && one >= 0 && one <= 6);
  // Empty is every day, so an area nobody has touched is unchanged.
  if (said.length === 0) return true;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return said.includes(weekday);
}

/** Said the same way on every screen, because it is the same promise. */
export const ESTIMATE_NOTE =
  "This is an estimate, not a time to the minute. Half an hour either way is normal, and you are called when the food is at your block.";

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * The time a car of its own would get there, rounded up to the next half
 * hour. Never down: rounding down names a time the food cannot be there by,
 * which is the one thing an estimate must not do.
 */
export function aroundPhrase(at: string): string {
  const when = new Date(at);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hour12: false,
    }).format(when)
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", minute: "2-digit" }).format(
      when
    )
  );
  const rounded = Math.ceil((hour * 60 + minute) / 30) * 30;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const shown = h > 12 ? h - 12 : h;
  return `around ${shown}${m === 0 ? "" : ":" + String(m).padStart(2, "0")}${suffix}`;
}

/** Today in Lagos, as the shop's clock has it. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);
}

/** A basket somebody was sent, as the shop works it out. */
export type LinkView = {
  code: string;
  title: string;
  /** "Order now, get it around 4:30pm today". */
  when: string;
  estimate: string;
  note: string;
  lines: { name: string; restaurant: string; qty: number; choices: string[]; total: number }[];
  food: number;
  /** Null means the ordinary rules, which cannot be known until it is placed. */
  fee: number | null;
  swaps: { name: string; chosen: string; others: string[] }[];
  instead: {
    index: number;
    name: string;
    restaurant: string;
    choices: string[];
    items: number;
    food: number;
  }[];
  hasCardLink: boolean;
  hostels: string[];
  askUs: string;
};

/**
 * Delivery priced by what the shopping comes to.
 *
 * A restaurant's ladder counts containers, because a car carrying twelve
 * takeaway boxes is a different car from one carrying two. A market is not
 * like that: eleven peppers and a bag of rice is one trip and two bags, and
 * the container ladder would call it eleven containers.
 */
export type ValueBand = { upTo: number | null; fee: number };

/** The dearest ladder this cart touches, because one car fetches all of it. */
export function valueLadderFor(
  shop: Shop | null,
  restaurantIds: string[]
): ValueBand[] {
  const byKitchen = shop?.valueBandsOf ?? {};
  return restaurantIds
    .map((id) => byKitchen[id])
    .filter((one): one is ValueBand[] => Array.isArray(one) && one.length > 0)
    .reduce<ValueBand[]>((worst, one) => (last(one) > last(worst) ? one : worst), []);
}

/** What this much shopping costs to bring. */
export function feeForValue(value: number, bands: ValueBand[]): number {
  if (bands.length === 0) return 0;
  const found = bands.find((band) => band.upTo === null || value <= band.upTo);
  return (found ?? bands[bands.length - 1]).fee;
}

const last = (bands: ValueBand[]) => bands[bands.length - 1]?.fee ?? 0;

/** Whether this kitchen prices by what the shopping comes to. */
export function pricesByValue(shop: Shop | null, restaurantId: string): boolean {
  return ((shop?.valueBandsOf ?? {})[restaurantId] ?? []).length > 0;
}

/**
 * What a cart is charged where a value ladder is in play.
 *
 * Two errands, two fees, added together: the market half pays by what the
 * shopping comes to and the restaurant half by how much of the car it fills.
 * The same sentence the server bills by, so the number on the screen is the
 * number on the bill.
 */
export function feeAcross(args: {
  marketFood: number;
  restaurantFee: number;
  bands: ValueBand[];
}): number {
  const market =
    args.bands.length > 0 && args.marketFood > 0 ? feeForValue(args.marketFood, args.bands) : 0;
  return market + args.restaurantFee;
}

/**
 * The delivery ladder as rows, for showing somebody why their fee is what
 * it is.
 *
 * The same shape the website's table has, worked out from the bands the
 * shop sent rather than from a copy kept here: a ladder the app believes in
 * and the server does not charge by is worse than no ladder at all.
 */
export function bandRows(
  bands: Shop["bands"],
  flashFee: number | null
): { label: string; fee: number }[] {
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  return ladder.map((band, index) => {
    const from = index === 0 ? 1 : (ladder[index - 1].maxItems ?? 0) + 1;
    return {
      label: band.maxItems === null ? `${from}+ items` : `${from}-${band.maxItems} items`,
      fee: feeFor(from, bands, flashFee),
    };
  });
}

/** Which rung an order of this many containers lands on, or -1 for none. */
export function bandIndex(bands: Shop["bands"], items: number): number {
  if (items <= 0) return -1;
  const ladder = bands.length > 0 ? bands : [{ maxItems: null, fee: 4000 }];
  const found = ladder.findIndex((step) => step.maxItems !== null && items <= step.maxItems);
  return found === -1 ? ladder.length - 1 : found;
}

/** What the shopping ladder looks like as rows, for the same question. */
export function valueRows(bands: ValueBand[]): { label: string; fee: number }[] {
  return bands.map((band, index) => {
    const from = index === 0 ? 0 : (bands[index - 1].upTo ?? 0) + 1;
    return {
      label:
        band.upTo === null
          ? `${naira(from)} and up`
          : `${naira(from)} to ${naira(band.upTo)}`,
      fee: band.fee,
    };
  });
}

/**
 * The countdown text: "3h 12m", "12m 04s", or "now".
 *
 * Word for word what the website says, because the deadline on the front
 * page of the app and the deadline on the front page of the site are the
 * same deadline, and two ways of saying it is two shops.
 */
export function countdown(msRemaining: number): string {
  if (msRemaining <= 0) return "now";
  const total = Math.floor(msRemaining / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  // Past a day, in days. "71h 52m" is a sum somebody has to do before they
  // know whether that is tonight or the weekend, which is the opposite of
  // what a countdown is for.
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rest = h % 24;
    return rest === 0 ? `${d}d` : `${d}d ${rest}h`;
  }
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/**
 * Delivery priced by the cool box rather than by the thing.
 *
 * Fantasy ice cream is small and the people who buy it buy a lot: fifteen
 * is one cool box and thirty is two. On the container ladder fifteen of
 * them price as fifteen takeaway boxes, which is a number nobody pays.
 *
 * And it is not a stop the car makes for its own sake. It is grabbed on the
 * way past, so it is the dearer of the two rather than the sum: three
 * Domino's pizzas and an ice cream pays for the pizzas, and sixty ice
 * creams and one pizza pays for four cool boxes.
 *
 * The same sentence the server bills by, so the number on the phone is the
 * number on the bill.
 */
export type StepFee = {
  first: number;
  firstFee: number;
  step: number;
  stepFee: number;
};

/** The dearest box ladder this cart touches, or none. */
export function stepsFor(shop: Shop | null, itemIds: string[]): StepFee | null {
  const byItem = shop?.stepFeeOf ?? {};
  let worst: StepFee | null = null;
  for (const id of itemIds) {
    const one = byItem[id];
    if (!one) continue;
    if (worst === null || one.firstFee > worst.firstFee) worst = one;
  }
  return worst;
}

/** Whether this thing is priced by the cool box. */
export function pricesByStep(shop: Shop | null, itemId: string): boolean {
  return (shop?.stepFeeOf ?? {})[itemId] !== undefined;
}

/** What this many of them costs to bring. Part of a lot is a lot. */
export function feeByStep(count: number, steps: StepFee | null): number {
  if (steps === null || steps.first < 1 || steps.step < 1) return 0;
  const many = Math.max(0, Math.floor(Number(count) || 0));
  if (many <= 0) return 0;
  if (many <= steps.first) return steps.firstFee;
  return steps.firstFee + Math.ceil((many - steps.first) / steps.step) * steps.stepFee;
}

/** The dearer of what the car went for and what the cool boxes come to. */
export function feeRidingAlong(args: {
  stepCount: number;
  steps: StepFee | null;
  otherFee: number;
}): number {
  if (args.steps === null || args.stepCount <= 0) return args.otherFee;
  return Math.max(args.otherFee, feeByStep(args.stepCount, args.steps));
}

/**
 * The first clock time in a window, as hours since midnight.
 *
 * The shop writes both a run's window and a car's in one form, "between
 * 4pm and 7pm", so the start is the first time in the string. Unreadable
 * comes back null and the caller decides: guessing a time here would move
 * money. The same function as the website's lib/pick-a-day.
 */
export function windowStart(said: string): number | null {
  const found = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(said ?? "");
  if (!found) return null;
  const hour = Number(found[1]) % 12;
  const minutes = Number(found[2] ?? 0);
  return hour + (found[3].toLowerCase() === "pm" ? 12 : 0) + minutes / 60;
}

/**
 * The other way of getting it here, where it is worth saying at all.
 *
 * A run is always worth offering, because it is the cheaper one. A car is
 * not: it costs more and the only thing it buys is arriving sooner, so
 * "in a hurry? we can be there between 4pm and 7pm" under a headline
 * reading between 5pm and 7pm is the shop selling an hour, maybe, for a
 * bigger fee. Two hours, the same as the website and the chat.
 */
type Arriving = { said: string; onARun: boolean };

export function otherWorthSaying<T extends Arriving>(
  decided: Arriving,
  other: T | null
): T | null {
  if (!other || other.said === decided.said) return null;
  if (!decided.onARun) return other;
  /*
   * A car on a later day is not a hurry at all.
   *
   * The hours were compared and the days were not, so a car between two
   * and five tomorrow read as sooner than a run between a quarter to seven
   * and seven tonight, and was offered for more money under a headline
   * promising the food this evening. Read off the day word, because the
   * sentence is all the app is given.
   */
  const dayRank = (said: string) =>
    / today\b/.test(said) ? 0 : / tomorrow\b/.test(said) ? 1 : 2;
  if (dayRank(other.said) > dayRank(decided.said)) return null;
  // Read off what is actually said, because that is the only window the
  // app is given: "between 5pm and 7pm today".
  const run = windowStart(decided.said);
  const car = windowStart(other.said);
  if (run === null || car === null) return other;
  return run - car >= 2 ? other : null;
}
