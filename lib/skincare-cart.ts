"use client";

import { useSyncExternalStore } from "react";

/**
 * A basket of its own, kept apart from the food, and one per counter.
 *
 * Skincare arrives on one car a week and food arrives this afternoon, so they
 * cannot be the same order, and a single cart holding both would have to
 * explain that at the worst possible moment. Two baskets is the honest shape:
 * putting a cleanser in changes nothing about the pizza waiting in the other
 * one, and ordering either leaves the other where it is.
 *
 * The pharmacy made it three. It is a different shop from the skincare
 * shelf even though both go on a Saturday, so a basket holding cough syrup
 * and a cleanser would be one order against two shops. Each counter gets
 * its own store and its own key in storage, and a basket somebody left on
 * one shelf is still there when they come back to it.
 */
export type ShelfLine = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
  qty: number;
};

/**
 * The empty basket, as one object that never changes.
 *
 * A fresh `[]` on every call is a new value every time React asks, so it
 * concludes the store changed, asks again, and does that for ever: "the
 * result of getServerSnapshot should be cached to avoid an infinite loop".
 * The food cart keeps its own EMPTY for the same reason.
 */
const EMPTY: ShelfLine[] = [];

type Store = {
  lines: ShelfLine[];
  loaded: boolean;
  listeners: Set<() => void>;
  key: string;
};

/*
 * One store per counter, made the first time anything asks for it.
 *
 * The skincare key is the one it shipped with, spelt out rather than built
 * from the counter's name: changing it would empty the basket of everybody
 * who had one open the day this went out.
 */
const KEYS: Record<string, string> = { skincare: "sudu_skincare_v1" };
const stores = new Map<string, Store>();

function storeFor(counter: string): Store {
  let store = stores.get(counter);
  if (!store) {
    store = {
      lines: [],
      loaded: false,
      listeners: new Set(),
      key: KEYS[counter] ?? `sudu_shelf_${counter}_v1`,
    };
    stores.set(counter, store);
  }
  return store;
}

function load(store: Store): void {
  if (store.loaded) return;
  store.loaded = true;
  try {
    const saved = JSON.parse(window.localStorage.getItem(store.key) ?? "[]");
    store.lines = Array.isArray(saved) ? saved : [];
  } catch {
    store.lines = [];
  }
}

function save(store: Store, next: ShelfLine[]): void {
  store.lines = next;
  try {
    window.localStorage.setItem(store.key, JSON.stringify(next));
  } catch {
    /* Without storage it still works until the tab is closed. */
  }
  for (const listen of store.listeners) listen();
}

/** The basket on one counter. Skincare where nothing says otherwise. */
export function useShelf(counter = "skincare"): ShelfLine[] {
  const store = storeFor(counter);
  return useSyncExternalStore(
    (listen) => {
      store.listeners.add(listen);
      return () => store.listeners.delete(listen);
    },
    () => {
      load(store);
      return store.lines;
    },
    () => EMPTY
  );
}

export function addToShelf(
  line: Omit<ShelfLine, "qty">,
  qty = 1,
  counter = "skincare"
): void {
  const store = storeFor(counter);
  load(store);
  const found = store.lines.find((one) => one.id === line.id);
  save(
    store,
    found
      ? store.lines.map((one) =>
          one.id === line.id ? { ...one, qty: one.qty + qty } : one
        )
      : [...store.lines, { ...line, qty }]
  );
}

export function setShelfQty(id: string, qty: number, counter = "skincare"): void {
  const store = storeFor(counter);
  load(store);
  save(
    store,
    qty <= 0
      ? store.lines.filter((one) => one.id !== id)
      : store.lines.map((one) => (one.id === id ? { ...one, qty } : one))
  );
}

export function emptyShelf(counter = "skincare"): void {
  save(storeFor(counter), []);
}

export function shelfCount(list: ShelfLine[]): number {
  return list.reduce((total, one) => total + one.qty, 0);
}

export function shelfTotal(list: ShelfLine[]): number {
  return list.reduce((total, one) => total + one.price * one.qty, 0);
}
