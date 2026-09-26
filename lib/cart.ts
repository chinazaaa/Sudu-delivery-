"use client";

import { useSyncExternalStore } from "react";

import { containersIn } from "./containers";

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
  /** How much of the car it takes, as a percentage of one container. Carried
   *  on the line so the cart can price without asking the server again, and
   *  absent on a cart saved before this existed, which reads as a whole one. */
  containerPct?: number;
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
            : {
                name: entry.name,
                phone: entry.phone ?? "",
                hostel: entry.hostel ?? "",
                // Where their food goes and how they pay used to be dropped
                // here, so a refresh at checkout asked for both again.
                goesTo: entry.goesTo,
                pays: entry.pays,
              }
        )
      : [];
    activePerson = typeof saved.active === "string" ? saved.active : "";

    // Food left labelled for somebody the list no longer has comes back to
    // whoever is ordering. Without this it is invisible in the cart and still
    // in the count, the subtotal and the delivery fee, which is what happened
    // when the people were moved to a new key and the old list stopped
    // loading.
    const reclaimed = reclaim(lines, people);
    if (reclaimed !== lines) {
      lines = reclaimed;
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    }
  } catch {
    lines = [];
    people = [];
    activePerson = "";
  }
}


/**
 * Every name the cart has food under: the people on the list, then anyone a
 * line still names who is not on it. Grouping by the list alone is what lets
 * a line go missing, so the grouping asks the cart as well.
 *
 * The empty string leads, standing for the person doing the ordering.
 */
export function groupNames(list: CartLine[], known: Person[]): string[] {
  const names = known.map((person) => person.name);
  const strays = list
    .map((line) => line.forName)
    .filter((name) => name && !names.includes(name));
  return ["", ...names, ...new Set(strays)];
}

/**
 * Lines whose owner has gone, handed back to the person ordering.
 *
 * A line carries a name, and the cart shows one group per person it knows
 * about. A name it does not know means a line nobody renders and everybody
 * pays for. Two lines that become the same thing once the name is off are
 * added together rather than left as two identical rows.
 *
 * The same list comes back untouched when there is nothing to reclaim, so a
 * load that changes nothing writes nothing.
 */
export function reclaim(list: CartLine[], known: Person[]): CartLine[] {
  const names = new Set(known.map((person) => person.name));
  if (list.every((line) => !line.forName || names.has(line.forName))) return list;

  const merged: CartLine[] = [];
  for (const line of list) {
    if (!line.forName || names.has(line.forName)) {
      merged.push({ ...line });
      continue;
    }
    const key = lineKey(line.itemId, line.optionIds, "");
    const twin = merged.find((other) => other.key === key);
    if (twin) twin.qty += line.qty;
    else merged.push({ ...line, forName: "", key });
  }
  return merged;
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

/**
 * @param owner Whose food this is, when it is not whoever is being shopped
 *  for right now: changing Bola's pizza has to give it back to Bola.
 */
export function addLine(
  line: Omit<CartLine, "key" | "qty" | "forName">,
  qty = 1,
  owner?: string
): void {
  load();
  // Whoever is being shopped for right now owns the line.
  const forName = owner ?? activePerson;
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

/**
 * How much of the car this cart fills, which is what delivery is priced on.
 *
 * Not a count of lines any more: a bottle of Coke is a quarter of a container
 * and a restaurant's three-pizza deal is three. See lib/containers.
 */
export const countItems = (cart: CartLine[]) =>
  containersIn(cart.map((l) => ({ qty: l.qty, container_pct: l.containerPct })));
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

/**
 * Puts a basket back in step with the menu.
 *
 * A line keeps the price it had when it went in. That is right for an order
 * already placed and wrong for a basket left open: a cart saved while the
 * menu was half imported showed nothing at all, and the first true number
 * anybody saw was at the checkout, which is a bad place to be surprised.
 *
 * Only what is known is touched. A dish that is no longer on the menu is
 * left exactly as it is rather than being silently zeroed, because a price
 * we cannot check is not the same as a price of nothing.
 */
export function reprice(
  itemPrice: Record<string, number>,
  optionDelta: Record<string, number>
): void {
  load();
  if (lines.length === 0) return;

  let moved = false;
  const next = lines.map((line) => {
    const base = itemPrice[line.itemId];
    if (base === undefined) return line;

    const now =
      base +
      line.optionIds.reduce((sum, id) => sum + (optionDelta[id] ?? 0), 0);
    if (now === line.unitPrice) return line;

    moved = true;
    return { ...line, unitPrice: now };
  });

  if (moved) save(next);
}
