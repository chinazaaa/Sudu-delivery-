import type { BatchSlot } from "./config";
import type { BatchStage } from "./stages";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  closes_at: string;
  active: boolean;
  sort_order: number;
  logo_url: string;
  banner_url: string;
  brand_hex: string;
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
};

export type OrderStatus = "pending" | "paid" | "refunded" | "delivered";

export type Order = {
  id: string;
  batch_id: string;
  customer_phone: string;
  customer_name: string;
  hostel: string;
  subtotal_food: number;
  fee: number;
  discount: number;
  total: number;
  payment_ref: string | null;
  paid_at: string | null;
  promoter_code: string | null;
  status: OrderStatus;
  created_at: string;
  group_id: string | null;
  for_name: string | null;
  refund_owed: number;
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
  created_at: string;
};

export type Promoter = {
  code: string;
  name: string;
  phone: string;
  rate: number;
  active: boolean;
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
