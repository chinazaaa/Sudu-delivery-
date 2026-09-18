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
    options: { id: string; name: string; priceDelta: number }[];
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
  paymentMethod: string;
  paymentLink: string | null;
  narration: string;
  hostel: string;
  run: { label: string; cutOffISO: string; window: string };
  lines: { name: string; restaurant: string; qty: number; choices: string[]; unitPrice: number }[];
  accounts: { bank: string; name: string; number: string }[];
};

export const api = {
  shop: () => get<Shop>("/menu"),
  order: (id: string) => get<OrderView>(`/order/${id}`),
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
    lines: { menu_item_id: string; qty: number; option_ids?: string[] }[];
    coupon?: string;
    paymentMethod: "transfer" | "card";
    customerNote?: string;
  }) => post<{ orderId: string; token: string | null }>("/order", order),
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
