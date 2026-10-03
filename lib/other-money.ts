import { db } from "./supabase";

/**
 * Money that did not come through a run.
 *
 * Somebody pays ₦20,000 for an errand nobody drove a car for. Before this,
 * the only way to see it in the figures was to make up an order, mark it
 * paid and mark it delivered, which put a bag on a run sheet that nobody was
 * delivering. This is one line instead.
 */
export type OtherMoney = {
  id: string;
  happened_on: string;
  what: string;
  who: string;
  /** Whose it was, where we know. Ties the line to a customer card. */
  phone: string;
  /** How many of it. One, unless somebody says otherwise. */
  how_many: number;
  /** What sort of cost it is: hosting, bank charges, data. Empty on money
   *  coming in, where the thing itself is the description. */
  kind: string;
  /** What she paid to have it brought, inside `took` but counted apart:
   *  the goods are bought and sold on, the trip is the work. */
  fee: number;
  /** What they paid us. */
  took: number;
  /** What it cost us to do it. */
  spent: number;
  note: string;
};

/** Takings less costs. The only sum this file does. */
export const madeOn = (one: { took: number; spent: number }): number =>
  one.took - one.spent;

/** Everything since a day, newest first. Empty where the table is not there
 *  yet, so a deploy landing before the SQL leaves admin working. */
export async function otherMoneySince(day: string): Promise<OtherMoney[]> {
  try {
    const { data, error } = await db()
      .from("other_money")
      .select("*")
      .gte("happened_on", day)
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as OtherMoney[];
  } catch {
    return [];
  }
}

/** What these came to, for the dashboard. */
export function otherMoneyTotals(rows: OtherMoney[]): {
  took: number;
  fee: number;
  spent: number;
  made: number;
  count: number;
} {
  return {
    took: rows.reduce((sum, one) => sum + one.took, 0),
    fee: rows.reduce((sum, one) => sum + (one.fee ?? 0), 0),
    spent: rows.reduce((sum, one) => sum + one.spent, 0),
    made: rows.reduce((sum, one) => sum + madeOn(one), 0),
    count: rows.length,
  };
}

/** The day the dashboard and this page both count back to. */
export const WINDOW_DAYS = 28;

export const windowStart = (days = WINDOW_DAYS): string =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

/** What one person has paid us outside of any order. */
export async function otherMoneyFor(phone: string): Promise<OtherMoney[]> {
  const number = phone.trim();
  if (number === "") return [];
  try {
    const { data, error } = await db()
      .from("other_money")
      .select("*")
      .eq("phone", number)
      .order("happened_on", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as OtherMoney[];
  } catch {
    return [];
  }
}

/**
 * What each of these numbers has paid for an errand, keyed by phone.
 *
 * For the customers list, where somebody who paid ₦20,000 for an adapter and
 * never placed an order would otherwise read as nought.
 */
export async function errandsBy(
  phones: string[]
): Promise<Map<string, { took: number; count: number }>> {
  const wanted = [...new Set(phones.filter(Boolean))];
  if (wanted.length === 0) return new Map();

  try {
    const { data, error } = await db()
      .from("other_money")
      .select("phone, took")
      .in("phone", wanted);
    if (error) throw new Error(error.message);

    const out = new Map<string, { took: number; count: number }>();
    for (const row of (data ?? []) as { phone: string; took: number }[]) {
      const seen = out.get(row.phone) ?? { took: 0, count: 0 };
      seen.took += row.took ?? 0;
      seen.count += 1;
      out.set(row.phone, seen);
    }
    return out;
  } catch {
    return new Map();
  }
}

/**
 * The kinds of cost a shop like this actually has.
 *
 * Offered rather than enforced: the box takes anything, these are only what
 * comes up first, so a month of outgoings groups itself instead of being
 * one list nobody can read a pattern out of.
 */
export const COST_KINDS = [
  "Hosting",
  "Bank charges",
  "Data and airtime",
  "Transport",
  "Packaging",
  "Marketing",
  "Equipment",
  "Wages",
  "Other",
] as const;

/** Tidied so two spellings of the same thing do not become two columns. */
export function tidyKind(said: string): string {
  const word = String(said ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (word === "") return "";
  const known = (COST_KINDS as readonly string[]).find(
    (one) => one.toLowerCase() === word.toLowerCase()
  );
  return known ?? word.charAt(0).toUpperCase() + word.slice(1);
}

/** What was paid out in this window, by kind, biggest first. */
export function costsByKind(
  rows: OtherMoney[]
): { kind: string; spent: number; count: number }[] {
  const out = new Map<string, { kind: string; spent: number; count: number }>();
  for (const one of rows) {
    if (one.spent <= 0) continue;
    const kind = (one.kind ?? "").trim() || (one.took > 0 ? "Buying for somebody" : "Other");
    const seen = out.get(kind) ?? { kind, spent: 0, count: 0 };
    seen.spent += one.spent;
    seen.count += 1;
    out.set(kind, seen);
  }
  return [...out.values()].sort((a, b) => b.spent - a.spent);
}
