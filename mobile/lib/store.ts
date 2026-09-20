import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

/**
 * The cart, and the little the app remembers about the person holding it.
 *
 * Nobody signs in. The phone keeps its own cart, the number last used at
 * checkout, and the orders placed from this phone, so the home screen can say
 * where the most recent one has got to without asking anybody to log in.
 */
export type Line = {
  key: string;
  itemId: string;
  name: string;
  restaurant: string;
  imageUrl: string;
  unitPrice: number;
  qty: number;
  optionIds: string[];
  choices: string[];
  /** Whose food this is, in a group order. Empty means the person ordering. */
  forName: string;
};

/** Somebody else with food in this cart. */
export type Person = {
  name: string;
  phone: string;
  hostel: string;
  /** Where their food goes: with mine, or to them. */
  goesTo: "mine" | "theirs" | null;
  /** How they pay, when everybody pays their own share. */
  pays: "transfer" | "card";
};

export type Me = {
  name: string;
  phone: string;
  hostel: string;
  token: string | null;
  /** How they pay, kept with the number and the block because it is the same
   *  kind of fact about them and changes about as often. */
  paymentMethod?: "transfer" | "card";
};

const CART = "sudu.cart";
const PARTY = "sudu.party";
const PAST = "sudu.parties";
const PEOPLE = "sudu.people";
const ME = "sudu.me";
const MINE = "sudu.orders";
const VISITOR = "sudu.visitor";

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* A phone with no room left still sells food. */
  }
}

/**
 * A random id for this install, so screens can be counted without anybody
 * being identified. It is not a number, not a name, and never leaves with
 * anything attached to it: it exists only so two views by the same person do
 * not read as two people.
 */
let visitorHeld = "";

export async function visitorId(): Promise<string> {
  if (visitorHeld) return visitorHeld;
  try {
    const found = await AsyncStorage.getItem(VISITOR);
    if (found) {
      visitorHeld = found;
      return found;
    }
    const made = String(Math.random()).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem(VISITOR, made);
    visitorHeld = made;
    return made;
  } catch {
    // No storage. The visit still counts, it just counts as a new person.
    visitorHeld = "anon-" + Math.random().toString(36).slice(2, 12);
    return visitorHeld;
  }
}

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

export const cart = {
  read: () => read<Line[]>(CART, []),
  async add(line: Omit<Line, "key" | "qty" | "forName"> & { forName?: string }, qty = 1): Promise<void> {
    const lines = await cart.read();
    const forName = line.forName ?? "";
    // Two people ordering the same thing are two lines, because the bags are
    // labelled by name when they are handed out.
    const key = [line.itemId, ...[...line.optionIds].sort(), `for:${forName}`].join("|");
    const found = lines.find((one) => one.key === key);
    await write(
      CART,
      found
        ? lines.map((one) => (one.key === key ? { ...one, qty: one.qty + qty } : one))
        : [...lines, { ...line, forName, key, qty }]
    );
    changed();
  },
  async setQty(key: string, qty: number): Promise<void> {
    const lines = await cart.read();
    await write(
      CART,
      qty <= 0 ? lines.filter((one) => one.key !== key) : lines.map((one) => (one.key === key ? { ...one, qty } : one))
    );
    changed();
  },
  async setForName(key: string, forName: string): Promise<void> {
    const lines = await cart.read();
    await write(
      CART,
      lines.map((one) =>
        one.key === key
          ? {
              ...one,
              forName,
              key: [one.itemId, ...[...one.optionIds].sort(), `for:${forName}`].join("|"),
            }
          : one
      )
    );
    changed();
  },
  async clear(): Promise<void> {
    await write(CART, []);
    changed();
  },
};

/**
 * The friends in this cart.
 *
 * Kept beside the cart rather than on the server: until an order is placed
 * they are nobody's business but the person holding the phone.
 */
export const people = {
  read: () => read<Person[]>(PEOPLE, []),
  async add(name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed === "") return;
    const all = await people.read();
    if (all.some((one) => one.name === trimmed)) return;
    await write(PEOPLE, [...all, { name: trimmed, phone: "", hostel: "", goesTo: null, pays: "transfer" }]);
    changed();
  },
  async update(name: string, patch: Partial<Person>): Promise<void> {
    const all = await people.read();
    await write(PEOPLE, all.map((one) => (one.name === name ? { ...one, ...patch } : one)));
    changed();
  },
  async remove(name: string): Promise<void> {
    const all = await people.read();
    await write(PEOPLE, all.filter((one) => one.name !== name));
    // Their food comes back to whoever is ordering rather than vanishing.
    const lines = await cart.read();
    await write(
      CART,
      lines.map((one) =>
        one.forName === name
          ? { ...one, forName: "", key: [one.itemId, ...[...one.optionIds].sort(), "for:"].join("|") }
          : one
      )
    );
    changed();
  },
  async clear(): Promise<void> {
    await write(PEOPLE, []);
    const lines = await cart.read();
    await write(
      CART,
      lines.map((one) => ({
        ...one,
        forName: "",
        key: [one.itemId, ...[...one.optionIds].sort(), "for:"].join("|"),
      }))
    );
    changed();
  },
};

export const me = {
  read: () => read<Me>(ME, { name: "", phone: "", hostel: "", token: null }),
  async save(next: Partial<Me>): Promise<void> {
    await write(ME, { ...(await me.read()), ...next });
    changed();
  },
};

/**
 * The shared delivery this phone is in, and the seat it holds in it.
 *
 * The website holds both in httpOnly cookies. An app has no cookies, so it
 * keeps the seat itself and sends it on every call. The seat is the only
 * thing that says who somebody is in a group, so it is generated once and
 * never shown to anybody.
 */
export type Party = {
  /** The group's real id, which is what every lookup uses. A short code is
   *  only ever a way in: it is swapped for this the moment somebody joins,
   *  because passing a code to a seat lookup finds nothing. */
  id: string;
  short: string | null;
  seat: string;
  leader: string;
};

export const party = {
  read: () => read<Party | null>(PARTY, null),
  async join(next: Party): Promise<void> {
    await write(PARTY, next);
    changed();
  },
  async leave(): Promise<void> {
    await write(PARTY, null);
    changed();
  },
};

/**
 * Groups an order actually came out of, newest first.
 *
 * Only those. A link somebody opened and left is a door into nothing, and
 * offering it as somewhere to go back to is offering them that.
 */
export const pastParties = {
  read: () => read<{ id: string; leader: string }[]>(PAST, []),
  async remember(one: { id: string; leader: string }): Promise<void> {
    const all = await pastParties.read();
    await write(PAST, [one, ...all.filter((past) => past.id !== one.id)].slice(0, 5));
    changed();
  },
};

export const mine = {
  read: () => read<string[]>(MINE, []),
  async add(id: string): Promise<void> {
    const ids = await mine.read();
    await write(MINE, [id, ...ids.filter((one) => one !== id)].slice(0, 20));
    changed();
  },
  /** Signing out, or being deleted, should leave nothing behind on the phone. */
  async clear(): Promise<void> {
    await write(MINE, []);
    changed();
  },
};

/** Re-reads whenever anything here changes, so every screen agrees. */
export function useStored<T>(load: () => Promise<T>, fallback: T): [T, () => void] {
  const [value, setValue] = useState<T>(fallback);

  const refresh = () => {
    void load().then(setValue);
  };

  useEffect(() => {
    refresh();
    const listener = () => refresh();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
    // The loader is rebuilt on every render; refreshing on mount is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, refresh];
}

export const countItems = (lines: Line[]) => lines.reduce((sum, line) => sum + line.qty, 0);
export const cartTotal = (lines: Line[]) =>
  lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);
