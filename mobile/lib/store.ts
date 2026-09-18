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
};

export type Me = { name: string; phone: string; hostel: string; token: string | null };

const CART = "sudu.cart";
const ME = "sudu.me";
const MINE = "sudu.orders";

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

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());

export const cart = {
  read: () => read<Line[]>(CART, []),
  async add(line: Omit<Line, "key" | "qty">, qty = 1): Promise<void> {
    const lines = await cart.read();
    const key = [line.itemId, ...[...line.optionIds].sort()].join("|");
    const found = lines.find((one) => one.key === key);
    await write(
      CART,
      found
        ? lines.map((one) => (one.key === key ? { ...one, qty: one.qty + qty } : one))
        : [...lines, { ...line, key, qty }]
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
  async clear(): Promise<void> {
    await write(CART, []);
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

export const mine = {
  read: () => read<string[]>(MINE, []),
  async add(id: string): Promise<void> {
    const ids = await mine.read();
    await write(MINE, [id, ...ids.filter((one) => one !== id)].slice(0, 20));
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
