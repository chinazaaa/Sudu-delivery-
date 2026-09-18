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

export type Run = {
  id: string;
  label: string;
  cutOffISO: string;
  deliveryWindow: string;
  flashFee: number | null;
};

export type Shop = {
  menu: Place[];
  /** The blocks admin delivers to. Empty means the list is not set up, and
   *  the checkout falls back to a typed answer exactly as the website does. */
  hostels?: string[];
  runs: Run[];
  bands: { maxItems: number | null; fee: number }[];
  shop: { tagline: string; ribbon: string; whatsapp: string };
};

export type OrderView = {
  id: string;
  ref: string;
  status: string;
  stage: string;
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
  run: { label: string; cutOffISO: string; window: string };
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
    post<{ token: string; phone: string; name: string; hostel: string }>("/signin", {
      phone,
      pin,
    }),
  order: (id: string) => get<OrderView>(`/order/${id}`),
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
    get<{ orders: { id: string; ref: string; status: string; stage: string; total: number; items: number; run: string }[] }>(
      "/orders",
      token
    ),
  place: (order: {
    batchId: string;
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
  registerPush: (pushToken: string, platform: string, token?: string | null) =>
    post<{ ok: boolean }>("/push", { token: pushToken, platform }, token),
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

export const naira = (amount: number) => "₦" + Math.round(amount).toLocaleString("en-NG");
