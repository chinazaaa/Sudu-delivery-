import Constants from "expo-constants";

/**
 * Everything the app knows comes from the shop's own server.
 *
 * The menu, the prices, what delivery costs, whether a run is still open: all
 * of it is read through here. The app never talks to the database, so a
 * change made in admin shows up in the app the moment it is saved, and a
 * phone cannot be taken apart to find a key that reads customers.
 */
const BASE =
  (Constants.expoConfig?.extra as { api?: string } | undefined)?.api ?? "https://sudu.store";

async function get<T>(path: string, token?: string | null): Promise<T> {
  const response = await fetch(`${BASE}/api/app${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body;
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
  const response = await fetch(`${BASE}/api/party${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(seat ? { "x-sudu-seat": seat } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body;
}

async function post<T>(path: string, data: unknown, token?: string | null): Promise<T> {
  const response = await fetch(`${BASE}/api/app${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body;
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

export type Item = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
  categoryId: string | null;
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
  /** Shut, or has as many orders as it can carry. Older servers leave both
   *  out, and then a run is offered and the order itself refuses it. */
  closed?: boolean;
  full?: boolean;
};

/** A time somebody can ask for, as the shop's own clock works it out. */
export type Slot = {
  at: string;
  /** "Between 12pm and 3pm", as it reads at the top of the list. */
  label: string;
  /** The same thing inside a sentence: "get it between 12pm and 3pm". Older
   *  servers do not send it, so anything reading it falls back to the label. */
  phrase?: string;
  day: "today" | "tomorrow";
  /** Under five hours away, which costs more because the car cannot wait. */
  urgent: boolean;
};

export type Shop = {
  menu: Place[];
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
  shop: { tagline: string; ribbon: string; whatsapp: string };
  /** The areas the shop delivers from, beyond Sangotedo, and which one each
   *  kitchen is in. Older servers send neither, and then everything is
   *  Sangotedo and every price is what it always was. */
  areas?: Area[];
  areaOf?: Record<string, string>;
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
  run: { sameDay?: boolean; label: string; cutOffISO: string; window: string };
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
const HELD_FOR = 60_000;

export const api = {
  shop: async (fresh = false): Promise<Shop> => {
    if (!fresh && held !== null && Date.now() - held.at < HELD_FOR) return held.shop;
    const shop = await get<Shop>("/menu");
    held = { at: Date.now(), shop };
    return shop;
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
  /** What this number already has on a run, so adding to it tops up the
   *  delivery rather than paying it twice. */
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
      }[];
      blocked: { name: string; reason: string }[];
    }>("/again", token),
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
  shelf: (query: {
    shelf?: string;
    brand?: string;
    q?: string;
    sort?: string;
    page?: number;
  } = {}) => {
    const asked = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "" && value !== 0) asked.set(key, String(value));
    }
    const tail = asked.toString();
    return get<Shelf>(`/skincare${tail === "" ? "" : `?${tail}`}`);
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
  }) => post<{ orderId: string; token: string | null }>("/skincare/order", order),
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
    // A time, not the block the shop divides the day into: "around 4:30pm"
    // is something somebody can plan an afternoon around.
    said: `${aroundPhrase(slot.at)} ${slot.day}`,
    onARun: false,
  });

  const runToday = runs.find((one) => one.runDate === today);
  if (runToday) return onRun(runToday);

  const slotToday = slots.find((one) => one.day === "today");
  if (slotToday) return onItsOwn(slotToday);

  const runLater = runs.find((one) => (one.runDate ?? "") > today);
  if (runLater) return onRun(runLater);

  const slotLater = slots.find((one) => one.day !== "today");
  if (slotLater) return onItsOwn(slotLater);

  return runs[0] ? onRun(runs[0]) : slots[0] ? onItsOwn(slots[0]) : null;
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
