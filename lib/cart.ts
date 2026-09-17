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
const PEOPLE_KEY = "sudu_people_v2";

/**
 * Someone else in a group order. The phone and hostel are optional: they are
 * only needed when that person pays for their own share, or collects their own
 * bag, and asking for them up front would slow every group down.
 */
export type Person = {
  name: string;
  phone: string;
  hostel: string;
  /** Unset until the person ordering says where this one's food goes. */
  goesTo?: "mine" | "theirs";
  /** How this person pays, when everyone pays their own share. */
  pays?: "transfer" | "card";
};

let lines: CartLine[] = [];
let people: Person[] = [];
let activePerson = "";
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    lines = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    const saved = JSON.parse(window.localStorage.getItem(PEOPLE_KEY) ?? "{}");
    people = Array.isArray(saved.people)
      ? saved.people.map((entry: Person | string) =>
          typeof entry === "string"
            ? { name: entry, phone: "", hostel: "" }
            : { name: entry.name, phone: entry.phone ?? "", hostel: entry.hostel ?? "" }
        )
      : [];
    activePerson = typeof saved.active === "string" ? saved.active : "";
  } catch {
    lines = [];
    people = [];
    activePerson = "";
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

/**
 * Two people ordering the same thing are two lines, because the bags are
 * labelled by name on delivery.
 */
export function lineKey(itemId: string, optionIds: string[], forName = ""): string {
  return [itemId, ...[...optionIds].sort(), `for:${forName}`].join("|");
}

function savePeople(next: { people: Person[]; active: string }): void {
  people = next.people;
  activePerson = next.active;
  try {
    window.localStorage.setItem(PEOPLE_KEY, JSON.stringify({ people: next.people, active: next.active }));
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener();
}

export function addPerson(name: string): void {
  load();
  const person = name.trim();
  if (!person) return;
  savePeople({
    people: people.some((p) => p.name === person)
      ? people
      : [...people, { name: person, phone: "", hostel: "" }],
    active: person,
  });
}

/** Their own number and block, filled in only when the order needs them. */
export function updatePerson(name: string, patch: Partial<Person>): void {
  load();
  savePeople({
    people: people.map((p) => (p.name === name ? { ...p, ...patch } : p)),
    active: activePerson,
  });
}

export function removePerson(name: string): void {
  load();
  // Their food goes back to unassigned rather than vanishing with them.
  save(lines.map((l) => (l.forName === name ? { ...l, forName: "" } : l)));
  savePeople({
    people: people.filter((p) => p.name !== name),
    active: activePerson === name ? "" : activePerson,
  });
}

export function setActivePerson(name: string): void {
  load();
  savePeople({ people, active: name });
}

export function clearPeople(): void {
  load();
  save(lines.map((l) => ({ ...l, forName: "" })));
  savePeople({ people: [], active: "" });
}

export function addLine(line: Omit<CartLine, "key" | "qty" | "forName">, qty = 1): void {
  load();
  // Whoever is being shopped for right now owns the line.
  const forName = activePerson;
  const key = lineKey(line.itemId, line.optionIds, forName);
  const existing = lines.find((l) => l.key === key);
  save(
    existing
      ? lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
      : [...lines, { ...line, forName, key, qty }]
  );
}

export function setQty(key: string, qty: number): void {
  load();
  save(qty <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, qty } : l)));
}

export function setForName(key: string, forName: string): void {
  load();
  const line = lines.find((l) => l.key === key);
  if (!line) return;

  const nextKey = lineKey(line.itemId, line.optionIds, forName);
  const merging = lines.find((l) => l.key === nextKey && l.key !== key);

  save(
    merging
      ? lines
          .filter((l) => l.key !== key)
          .map((l) => (l.key === nextKey ? { ...l, qty: l.qty + line.qty } : l))
      : lines.map((l) => (l.key === key ? { ...l, forName, key: nextKey } : l))
  );
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

export function usePeople(): { people: Person[]; active: string } {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return snapshot();
    },
    () => EMPTY_PEOPLE
  );
}

const EMPTY_PEOPLE = { people: [] as Person[], active: "" };
let peopleSnapshot = EMPTY_PEOPLE;

function snapshot(): { people: Person[]; active: string } {
  if (peopleSnapshot.people !== people || peopleSnapshot.active !== activePerson) {
    peopleSnapshot = { people, active: activePerson };
  }
  return peopleSnapshot;
}

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
