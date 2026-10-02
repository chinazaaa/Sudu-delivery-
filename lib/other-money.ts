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
  spent: number;
  made: number;
  count: number;
} {
  return {
    took: rows.reduce((sum, one) => sum + one.took, 0),
    spent: rows.reduce((sum, one) => sum + one.spent, 0),
    made: rows.reduce((sum, one) => sum + madeOn(one), 0),
    count: rows.length,
  };
}

/** The day the dashboard and this page both count back to. */
export const WINDOW_DAYS = 28;

export const windowStart = (days = WINDOW_DAYS): string =>
  new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
