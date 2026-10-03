import { db } from "./supabase";
import { lagosToday } from "./time";
import { tidyKind } from "./other-money";

/**
 * A cost that comes back every month.
 *
 * Supabase, a bank's monthly charge, a subscription. Not every cost is one
 * of these, so it is a list of its own rather than a tick box on the
 * ordinary form: most of what the shop pays for happens once.
 *
 * What is kept here is only the standing instruction. The lines it writes
 * are ordinary other money, so the profit sums never have to know this
 * exists, and a month already written is left exactly as it was: a bill that
 * was ₦18,000 in September was ₦18,000 in September, whatever it costs now.
 */
export type Standing = {
  id: string;
  what: string;
  kind: string;
  amount: number;
  on_day: number;
  active: boolean;
  from_month: string;
  made_through: string | null;
  note: string;
};

export async function standingCosts(): Promise<Standing[]> {
  try {
    const { data, error } = await db()
      .from("standing_costs")
      .select("*")
      .order("active", { ascending: false })
      .order("what");
    if (error) throw new Error(error.message);
    return (data ?? []) as Standing[];
  } catch {
    return [];
  }
}

/** The first of the month a day falls in. */
export const monthOf = (day: string): string => `${day.slice(0, 7)}-01`;

/** The first of the month after this one. December included. */
export function nextMonth(firstOfMonth: string): string {
  const at = new Date(`${firstOfMonth}T12:00:00Z`);
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1, 12))
    .toISOString()
    .slice(0, 10);
}

/**
 * Write whatever months are owed, for every standing cost that is on.
 *
 * There is no scheduler here and nothing worth running one for, so this is
 * done when somebody opens a page that cares. It is safe to call as often as
 * anything likes: a month already written is skipped by a unique index, and
 * the watermark means a line deleted on purpose is not quietly put back.
 *
 * A month is only written once the day it is taken on has arrived. A bill
 * due on the tenth is not an October cost on the second of October, it is a
 * bill nobody has been sent.
 */
export async function catchUpStanding(today = lagosToday()): Promise<number> {
  let written = 0;
  try {
    const { data } = await db()
      .from("standing_costs")
      .select("*")
      .eq("active", true);

    const thisMonth = monthOf(today);
    const dayOfMonth = Number(today.slice(8, 10));

    for (const row of (data ?? []) as Standing[]) {
      // Where we got to last time, or the month it starts from.
      let month = row.made_through ? nextMonth(row.made_through) : monthOf(row.from_month);
      let last: string | null = null;

      // A guard rather than a condition: a bad date in the table must not
      // become a loop that writes rows until something falls over.
      for (let guard = 0; guard < 120; guard += 1) {
        if (month > thisMonth) break;
        // This month, but the day it is taken has not come round yet. A
        // subscription billed on the tenth is not an October cost on the
        // second of October, it is a bill nobody has been sent.
        if (month === thisMonth && row.on_day > dayOfMonth) break;

        const on = `${month.slice(0, 7)}-${String(row.on_day).padStart(2, "0")}`;
        const { error } = await db().from("other_money").insert({
          happened_on: on,
          what: row.what,
          kind: tidyKind(row.kind),
          took: 0,
          spent: row.amount,
          note: row.note,
          standing_id: row.id,
          for_month: month,
        });
        // A duplicate means it was already there, which is a success.
        if (!error) written += 1;

        last = month;
        month = nextMonth(month);
      }

      if (last) {
        await db()
          .from("standing_costs")
          .update({ made_through: last })
          .eq("id", row.id);
      }
    }
  } catch {
    // Nothing here is worth failing a page over. The months that were not
    // written will be written the next time somebody opens it.
  }
  return written;
}
