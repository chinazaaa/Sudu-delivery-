import type { BatchSlot } from "./config";
import type { BatchStage } from "./stages";

export type Restaurant = {
  id: string;
  name: string;
  /** The readable half of a link: /r/dominos-pizza. Empty on a database that
   *  has not had the migration run, which is why nothing depends on it. */
  slug?: string | null;
  address: string;
  closes_at: string;
  active: boolean;
  sort_order: number;
  logo_url: string;
  banner_url: string;
  brand_hex: string;
  /** "food" or "skincare". Skincare is the same shop on a different day, and
   *  this is what keeps its two thousand products out of a food menu. */
  kind?: string;
  /** Where it is. Empty is Sangotedo, which is what the ladders were written
   *  for; anywhere else is further to drive and says so. */
  area?: string;
  /** Delivery priced by what the shopping comes to, as JSON. Empty is every
   *  restaurant today, and means the ordinary ladder counting containers. */
  value_bands?: string;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

export type OptionGroup = {
  id: string;
  menu_item_id: string;
  name: string;
  required: boolean;
  max_select: number;
  sort_order: number;
};

export type ItemOption = {
  id: string;
  group_id: string;
  name: string;
  price_delta: number;
  available: boolean;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  price_food: number;
  available: boolean;
  sort_order: number;
  image_url: string;
  description: string;
  category_id: string | null;
  /** Who makes it. Empty on food, where the restaurant is the maker. */
  brand?: string;
  /** The file its picture is expected to arrive as, so a photograph uploaded
   *  later lands on the right product without anybody matching names. */
  image_file?: string;
  /** Every shelf it sits on, as "|Cleansers|Korean Skin Care|". A shop's own
   *  sections overlap, and one category_id can only hold the first. */
  shelves?: string;
  /** How much of the car it takes, as a percentage of one container. A drink
   *  is 25 and a three-pizza deal is 300. Undefined before the column exists,
   *  which reads as a whole container and prices exactly as yesterday. */
  container_pct?: number;
};

export type BatchStatus = "open" | "closed" | "delivered" | "cancelled";

export type Batch = {
  id: string;
  run_date: string;
  slot: BatchSlot;
  cut_off_at: string;
  delivery_window_text: string;
  status: BatchStatus;
  capacity: number | null;
  flash_fee: number | null;
  flash_fee_reason: string;
  stage: BatchStage;
  stage_updated_at: string;
  /** A scheduled run everybody shares, or one person's same day delivery. */
  /** A shared car, a car going out for one order, or the weekly skincare
   *  drop. It is what keeps the last two out of the list customers pick a
   *  run from. */
  kind: "run" | "same_day" | "skincare" | "parcel";
  /** Which areas this car goes to, beyond Sangotedo, as "|lekki|". */
  areas?: string;
  /** The only counters this run fetches from, as "|id|id|". Empty is every
   *  one of them, which is what a run is unless somebody says otherwise. */
  only_places?: string;
  /** The time asked for. Only ever set on a same day delivery. */
  deliver_at: string | null;
  /** What the run cost to make, typed in once it is done. */
  fuel_cost: number;
  /** What the food actually cost at the counters, when that is not the menu
   *  price. Zero means the menu prices stand. */
  food_spend: number;
  driver_cost: number;
  /** Keke, bike, a car for the bags. Not the fuel and not the driver. */
  transport_cost: number;
  other_cost: number;
  cost_note: string;
  /** When the books were closed on it. Null while there is still work. */
  settled_at: string | null;
};

/** "cancelled" is only ever an order nobody paid for: a test, a duplicate,
 *  somebody who changed their mind before any money moved. Money that has
 *  moved needs a refund, which is what "refunded" is for. */
export type OrderStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  /** The short number on the run sheet and in messages: #1042. */
  order_no: number | null;
  batch_id: string;
  customer_phone: string;
  customer_name: string;
  hostel: string;
  /** Bought for somebody else: who is fed and who the driver rings. The
   *  customer above is whoever paid and is who every message about money
   *  goes to. Both null on an ordinary order, and undefined on a database
   *  that has not had the migration run. */
  deliver_to_name?: string | null;
  deliver_to_phone?: string | null;
  /** A parcel rather than food: which route it travels, what it is, where it
   *  is collected from and taken to, the weight band it was priced in and
   *  what the sender says it is worth. Null on every ordinary order. */
  parcel_route?: string | null;
  parcel_item?: string | null;
  parcel_shop?: string | null;
  parcel_value?: number | null;
  parcel_kg?: number | null;
  parcel_from?: string | null;
  parcel_to?: string | null;
  /** The day the sender asked for. The day it actually goes is on the batch,
   *  and is only set once the shop has agreed it. */
  parcel_wanted_on?: string | null;
  /** The address and the room exactly as they were typed, so admin can show
   *  the questions and their answers rather than a sentence built out of
   *  them. */
  parcel_address?: string | null;
  parcel_room?: string | null;
  subtotal_food: number;
  fee: number;
  discount: number;
  total: number;
  payment_ref: string | null;
  paid_at: string | null;
  /** The discount code used, if one was. */
  coupon_code: string | null;
  /** The order whose join link they opened, when they joined a delivery. */
  shared_with: string | null;
  /** Set when this person said they had finished adding to a shared delivery. */
  done_at: string | null;
  /** The seven character code its link uses. */
  short: string | null;
  /** One to five, once the food has arrived and they have said. */
  rating: number | null;
  feedback: string;
  rated_at: string | null;
  status: OrderStatus;
  created_at: string;
  group_id: string | null;
  /** The seat in a shared delivery this order was made from, so the browser
   *  holding that seat can be shown its own order after the close. */
  seat_token?: string | null;
  for_name: string | null;
  refund_owed: number;
  payment_method: "transfer" | "card";
  /** A card link generated by hand, kept so it can be sent again. */
  payment_link: string | null;
  /** What the customer asked for, in their words. */
  customer_note: string;
  /** What the admin wants remembered about this order. Never shown to them. */
  admin_note: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  unit_price_at_order: number;
  for_name: string | null;
};

export type OrderGroup = {
  id: string;
  batch_id: string;
  leader_phone: string;
  leader_name: string;
  hostel: string;
  mode: GroupMode;
  collect_mode: "leader" | "each";
  /** Set only on a shared delivery: when it stops taking people, and when it
   *  actually stopped. An ordinary group order has neither. */
  closes_at: string | null;
  closed_at: string | null;
  /** Who pays for everybody, when the group decided one person does. */
  payer_phone: string | null;
  /** The token from the link this party was started with. */
  party_token: string | null;
  created_at: string;
};

export type Promoter = {
  code: string;
  /** Their own four-digit sign-in, given out on WhatsApp. */
  pin?: string;
  name: string;
  phone: string;
  rate: number;
  active: boolean;
  /** Where their money goes. They keep it up to date themselves. */
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
};

/** What the cart posts to the server. Prices are never trusted from here. */
export type CartLine = {
  menu_item_id: string;
  qty: number;
  /** Chosen size, flavour and extras. Priced on the server, never here. */
  option_ids?: string[];
  /** Whose food this is, in a group cart. Null for a single-person order. */
  for_name?: string | null;
};

export type GroupMode = "one_payer" | "split";

export type Hostel = {
  id: string;
  name: string;
  note: string;
  active: boolean;
  sort_order: number;
};
