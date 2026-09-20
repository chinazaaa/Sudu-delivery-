"use client";

import { useSyncExternalStore } from "react";

/**
 * A basket of its own, kept apart from the food.
 *
 * Skincare arrives on one car a week and food arrives this afternoon, so they
 * cannot be the same order, and a single cart holding both would have to
 * explain that at the worst possible moment. Two baskets is the honest shape:
 * putting a cleanser in changes nothing about the pizza waiting in the other
 * one, and ordering either leaves the other where it is.
 */
export type ShelfLine = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  qty: number;
};

const KEY = "sudu_skincare_v1";

let lines: ShelfLine[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    lines = Array.isArray(saved) ? saved : [];
  } catch {
    lines = [];
  }
}

function save(next: ShelfLine[]): void {
  lines = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Without storage it still works until the tab is closed. */
  }
  for (const listen of listeners) listen();
}

export function useShelf(): ShelfLine[] {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => listeners.delete(listen);
    },
    () => {
      load();
      return lines;
    },
    () => []
  );
}

export function addToShelf(line: Omit<ShelfLine, "qty">, qty = 1): void {
  load();
  const found = lines.find((one) => one.id === line.id);
  save(
    found
      ? lines.map((one) => (one.id === line.id ? { ...one, qty: one.qty + qty } : one))
      : [...lines, { ...line, qty }]
  );
}

export function setShelfQty(id: string, qty: number): void {
  load();
  save(
    qty <= 0
      ? lines.filter((one) => one.id !== id)
      : lines.map((one) => (one.id === id ? { ...one, qty } : one))
  );
}

export function emptyShelf(): void {
  save([]);
}

export function shelfCount(list: ShelfLine[]): number {
  return list.reduce((total, one) => total + one.qty, 0);
}

export function shelfTotal(list: ShelfLine[]): number {
  return list.reduce((total, one) => total + one.price * one.qty, 0);
}
