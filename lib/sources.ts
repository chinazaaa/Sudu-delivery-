import { db } from "./supabase";
import { isGone, isPaid } from "./orders";
import { channelLabel } from "./came-from";
import { runProfitShares } from "./profit";

/**
 * Where the customers came from, and what each of those places is worth.
 *
 * Not the analytics page, which counts visits: a thousand people off
 * Google who looked once are a traffic number, and this is a different
 * question. Here a row is a set of real customers, and the money is every
 * order they have ever placed, because somebody a channel introduced is
 * still that channel's doing on their fourth order.
 *
 * Both halves of "who brought them" sit in one table on purpose. A
 * promoter is a person who gets paid and a channel is a place that costs
 * money to be in, and the comparison between them is the whole reason to
 * open this: an afternoon of posting and a promoter's commission are two
 * ways of spending to be introduced to somebody, and they should be read
 * side by side.
 */
export type SourceLine = {
  key: string;
  label: string;
  kind: "promoter" | "channel" | "none";
  /** People, not visits. */
  customers: number;
  /** How many of them have ever ordered. */
  ordered: number;
  orders: number;
  paid: number;
  money: number;
  /** Their share of the profit on the runs they were carried by. */
  profit: number;
  /** A run in there has no costs typed in yet, so profit is a best case. */
  estimated: boolean;
  lastOrder: string | null;
};

export async function sourceLines(): Promise<SourceLine[]> {
  const [{ data: peopleRows }, { data: orderRows }, { data: promoterRows }] =
    await Promise.all([
      db().from("customers").select("phone, came_from, promoter_code"),
      db()
        .from("orders")
        .select("customer_phone, batch_id, status, total, created_at"),
      db().from("promoters").select("code, name"),
    ]);

  const named = new Map(
    ((promoterRows ?? []) as { code: string; name: string }[]).map((one) => [
      one.code,
      one.name ?? one.code,
    ])
  );

  /*
   * Whoever or whatever brought this one.
   *
   * A promoter wins over a channel where there is both. Somebody who found
   * us on Instagram and then ordered through Ada's link is Ada's: she is
   * owed on it, and a row that counted her introduction under Instagram
   * would be the one row that costs real money to get wrong.
   */
  const sourceOf = (row: { came_from?: string; promoter_code?: string | null }) => {
    const code = String(row.promoter_code ?? "").trim();
    if (code !== "") {
      return { key: `p:${code}`, label: named.get(code) ?? code, kind: "promoter" as const };
    }
    const channel = String(row.came_from ?? "").trim();
    if (channel !== "") {
      return { key: `c:${channel}`, label: channelLabel(channel), kind: "channel" as const };
    }
    return { key: "", label: "Not known", kind: "none" as const };
  };

  const people = (peopleRows ?? []) as {
    phone: string;
    came_from?: string;
    promoter_code?: string | null;
  }[];

  const mine = new Map<string, ReturnType<typeof sourceOf>>();
  for (const one of people) mine.set(one.phone, sourceOf(one));

  const orders = ((orderRows ?? []) as Record<string, unknown>[]).filter(
    (one) => !isGone(String(one.status ?? ""))
  );

  // Every run any of this touches, read once.
  const runs = await runProfitShares([
    ...new Set(
      orders
        .filter((one) => isPaid(String(one.status ?? "")))
        .map((one) => String(one.batch_id ?? ""))
        .filter((id) => id !== "" && id !== "null")
    ),
  ]);

  const lines = new Map<string, SourceLine>();
  const ordered = new Map<string, Set<string>>();

  const of = (where: ReturnType<typeof sourceOf>): SourceLine => {
    const found = lines.get(where.key);
    if (found) return found;
    const made: SourceLine = {
      key: where.key,
      label: where.label,
      kind: where.kind,
      customers: 0,
      ordered: 0,
      orders: 0,
      paid: 0,
      money: 0,
      profit: 0,
      estimated: false,
      lastOrder: null,
    };
    lines.set(where.key, made);
    return made;
  };

  // The people first, so a channel that brought somebody who never ordered
  // still has a row saying exactly that.
  for (const one of people) of(mine.get(one.phone)!).customers += 1;

  for (const order of orders) {
    const phone = String(order.customer_phone ?? "");
    const where = mine.get(phone);
    // An order from somebody with no customer row at all. Rare, and it
    // belongs under Not known rather than under nothing.
    const line = of(where ?? { key: "", label: "Not known", kind: "none" });

    line.orders += 1;
    const seen = ordered.get(line.key) ?? new Set<string>();
    seen.add(phone);
    ordered.set(line.key, seen);

    const at = String(order.created_at ?? "");
    if (at !== "" && (line.lastOrder === null || at > line.lastOrder)) line.lastOrder = at;

    if (!isPaid(String(order.status ?? ""))) continue;

    line.paid += 1;
    line.money += Number(order.total ?? 0);

    const run = runs.get(String(order.batch_id ?? ""));
    if (!run || run.took <= 0) continue;
    line.profit += run.profit * (Number(order.total ?? 0) / run.took);
    if (run.estimated) line.estimated = true;
  }

  for (const line of lines.values()) {
    line.profit = Math.round(line.profit);
    line.ordered = ordered.get(line.key)?.size ?? 0;
  }

  return [...lines.values()]
    .filter((one) => one.customers > 0 || one.orders > 0)
    .sort((a, b) => b.profit - a.profit || b.money - a.money || b.customers - a.customers);
}
