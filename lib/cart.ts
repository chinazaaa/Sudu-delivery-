"use client";

import { useSyncExternalStore } from "react";

export type CartLine = {
  /** Item plus the exact choices: a large pepperoni is its own line. */
  key: string;
  itemId: string;
  optionIds: string[];
  name: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string;
  /** Base plus options, for display only. The server prices the real order. */
  unitPrice: number;
  choices: string[];
  qty: number;
  /** Who this is for in a group order. */
  forName: string;
};

const KEY = "sudu_cart_v1";
let lines: CartLine[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    lines = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    lines = [];
  }
}

function save(next: CartLine[]): void {
  lines = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Private mode. The cart still works for this page view. */
  }
  for (const listener of listeners) listener();
}

export function lineKey(itemId: string, optionIds: string[]): string {
  return [itemId, ...[...optionIds].sort()].join("|");
}

export function addLine(line: Omit<CartLine, "key" | "qty">, qty = 1): void {
  load();
  const key = lineKey(line.itemId, line.optionIds);
  const existing = lines.find((l) => l.key === key);
  save(
    existing
      ? lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
      : [...lines, { ...line, key, qty }]
  );
}

export function setQty(key: string, qty: number): void {
  load();
  save(qty <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, qty } : l)));
}

export function setForName(key: string, forName: string): void {
  load();
  save(lines.map((l) => (l.key === key ? { ...l, forName } : l)));
}

export function clearCart(): void {
  save([]);
}

function subscribe(listener: () => void): () => void {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: CartLine[] = [];

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return lines;
    },
    () => EMPTY
  );
}

export const countItems = (cart: CartLine[]) => cart.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (cart: CartLine[]) =>
  cart.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);

/** What gets posted to the server: ids and quantities only. */
export const toServerLines = (cart: CartLine[]) =>
  cart.map((l) => ({
    menu_item_id: l.itemId,
    qty: l.qty,
    option_ids: l.optionIds,
    for_name: l.forName || null,
  }));
