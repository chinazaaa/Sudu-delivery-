import type { BatchSlot } from "./config";

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  closes_at: string;
  active: boolean;
  sort_order: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  price_food: number;
  available: boolean;
  sort_order: number;
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
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  unit_price_at_order: number;
};

export type Promoter = {
  code: string;
  name: string;
  phone: string;
  rate: number;
  active: boolean;
};

/** What the cart posts to the server. Prices are never trusted from here. */
export type CartLine = { menu_item_id: string; qty: number };
