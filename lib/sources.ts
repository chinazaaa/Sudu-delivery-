import { db } from "./supabase";
import { isGone, isPaid } from "./orders";
import { channelLabel } from "./came-from";
import { runProfitShares } from "./profit";

/**
 * Where the customers came from, one source at a time.
 *
 * Not the analytics page, which counts visits off the web: referrers, utm
 * tags, page views. Somebody recommended by ChatGPT who then rang the shop
 * and had her order typed in by hand leaves no web trail at all, so no
 * amount of reading traffic will ever show what brought her. The only
 * record of it is what she said and what somebody wrote on her customer
 * page, and that is what this reads.
 *
 * Shaped like the brands page on purpose. A flat table of every source at
 * once answers "which is biggest" and nothing else, and the question
 * anybody actually arrives with is about one of them: who did ChatGPT
 * bring, did they order, what were they worth. One page with a picker,
 * because the question is always the same question and only the name
 * changes.
 */
export type SourcePick = { key: string; label: string; kind: "promoter" | "channel" };

export type SourcePerson = {
  phone: string;
  name: string;
  orders: number;
  spend: number;
  lastAt: string | null;
};

export type SourceNumbers = {
  /** People carrying this source, whether or not they ever ordered. */
  customers: number;
  /** How many of them actually ordered in the window. */
  ordered: number;
  orders: number;
  paid: number;
  money: number;
  /** Their share of the profit on the runs that carried them. */
  profit: number;
  /** A run in there has no costs typed in yet, so profit is a best case. */
  estimated: boolean;
  firstAt: string | null;
  lastAt: string | null;
  people: SourcePerson[];
};

type Person = {
  phone: string;
  name: string;
  came_from?: string;
  promoter_code?: string | null;
};

/**
 * Whoever or whatever brought this one.
 *
 * A promoter wins over a place where there is both. Somebody who found us
 * on Instagram and then ordered through Ada's link is Ada's: she is owed
 * on it, and a row that filed her introduction under Instagram would be
 * the one row that costs real money to get wrong.
 */
function sourceOf(row: Person, named: Map<string, string>): SourcePick | null {
  const code = String(row.promoter_code ?? "").trim();
  if (code !== "") {
    return { key: `p:${code}`, label: named.get(code) ?? code, kind: "promoter" };
  }
  const channel = String(row.came_from ?? "").trim();
  if (channel !== "") {
    return { key: `c:${channel}`, label: channelLabel(channel), kind: "channel" };
  }
  return null;
}

async function everybody(): Promise<{ people: Person[]; named: Map<string, string> }> {
  const [{ data: peopleRows }, { data: promoterRows }] = await Promise.all([
    db().from("customers").select("phone, name, came_from, promoter_code"),
    db().from("promoters").select("code, name"),
  ]);
  return {
    people: (peopleRows ?? []) as Person[],
    named: new Map(
      ((promoterRows ?? []) as { code: string; name: string }[]).map((one) => [
        one.code,
        one.name ?? one.code,
      ])
    ),
  };
}

/** Every source anybody is actually filed under, for the picker. */
export async function sourcesForPicker(): Promise<SourcePick[]> {
  const { people, named } = await everybody();

  const found = new Map<string, SourcePick>();
  for (const one of people) {
    const where = sourceOf(one, named);
    if (where && !found.has(where.key)) found.set(where.key, where);
  }

  // Places before people, each alphabetical. A promoter has their own page
  // already; a place has nowhere else to be looked at.
  return [...found.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label)
  );
}

/**
 * One source, in the numbers somebody would ask of it.
 *
 * Counted off people rather than orders, because the question is what a
 * source introduced. The money is every order those people placed, since
 * whoever introduced somebody is still the reason for their fourth order.
 */
export async function sourceNumbers(key: string, days = 0): Promise<SourceNumbers | null> {
  const { people, named } = await everybody();

  const mine = people.filter((one) => sourceOf(one, named)?.key === key);
  if (mine.length === 0) return null;

  const phones = mine.map((one) => one.phone);
  const since =
    days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : null;

  let ask = db()
    .from("orders")
    .select("customer_phone, batch_id, status, total, created_at")
    .in("customer_phone", phones);
  if (since !== null) ask = ask.gte("created_at", since);

  const { data: orderRows } = await ask;
  const orders = ((orderRows ?? []) as Record<string, unknown>[]).filter(
    (one) => !isGone(String(one.status ?? ""))
  );

  const runs = await runProfitShares([
    ...new Set(
      orders
        .filter((one) => isPaid(String(one.status ?? "")))
        .map((one) => String(one.batch_id ?? ""))
        .filter((id) => id !== "" && id !== "null")
    ),
  ]);

  const byPerson = new Map<string, SourcePerson>(
    mine.map((one) => [
      one.phone,
      { phone: one.phone, name: one.name ?? "", orders: 0, spend: 0, lastAt: null },
    ])
  );

  let paid = 0;
  let money = 0;
  let profit = 0;
  let estimated = false;
  let firstAt: string | null = null;
  let lastAt: string | null = null;

  for (const order of orders) {
    const phone = String(order.customer_phone ?? "");
    const person = byPerson.get(phone);
    const at = String(order.created_at ?? "");

    if (person) person.orders += 1;
    if (at !== "") {
      if (firstAt === null || at < firstAt) firstAt = at;
      if (lastAt === null || at > lastAt) lastAt = at;
      if (person && (person.lastAt === null || at > person.lastAt)) person.lastAt = at;
    }

    if (!isPaid(String(order.status ?? ""))) continue;

    paid += 1;
    const total = Number(order.total ?? 0);
    money += total;
    if (person) person.spend += total;

    const run = runs.get(String(order.batch_id ?? ""));
    if (!run || run.took <= 0) continue;
    profit += run.profit * (total / run.took);
    if (run.estimated) estimated = true;
  }

  const everyone = [...byPerson.values()].sort(
    (a, b) => b.spend - a.spend || b.orders - a.orders || a.name.localeCompare(b.name)
  );

  return {
    customers: mine.length,
    ordered: everyone.filter((one) => one.orders > 0).length,
    orders: orders.length,
    paid,
    money,
    profit: Math.round(profit),
    estimated,
    firstAt,
    lastAt,
    people: everyone,
  };
}
