import { db } from "./supabase";
import { isGone, isPaid, NOT_ORDERS_SQL } from "./orders";
import { SLOT_LABEL, type BatchSlot } from "./config";
import { runDateLabel } from "./time";
import { NUDGE_DEFAULT } from "./messages";
import { abandonedCarts } from "./carts";
import { safeSettings } from "./settings";

/** The one promoter, if there is one set up. */
export async function thePromoter(): Promise<{
  code: string;
  name: string;
  phone: string;
  rate: number;
  pin: string;
} | null> {
  const { data } = await db()
    .from("promoters")
    .select("code, name, phone, rate, pin")
    .eq("active", true)
    .order("code")
    .limit(1)
    .maybeSingle();
  return (data as any) ?? null;
}

export type PromoterRun = {
  batchId: string;
  runDate: string;
  slot: BatchSlot;
  label: string;
  /** Orders that counted: paid, and not refunded. */
  orders: number;
  /** Orders placed but not paid for. They earn nothing until they are. */
  unpaid: number;
  /** How many of the paid ones were a box, which is worth more to bring in. */
  boxes: number;
  earned: number;
  /** Who ordered, by first name. Somebody who brought two people in should
   *  be able to see that it was two people, and which two. First names
   *  only: they brought them in, they do not own their phone book. */
  people: string[];
  /** What has been handed over against this run in particular. */
  paidOut: number;
};

/** An order placed but not paid for, in a run that is still taking money. */
export type ChaseableOrder = {
  id: string;
  name: string;
  phone: string;
  total: number;
  label: string;
};

/** A cart somebody filled in and left, from one of their own customers. */
export type AbandonedCart = {
  id: string;
  name: string;
  phone: string;
  items: number;
  value: number;
  summary: string;
};

export type PromoterEarnings = {
  code: string;
  name: string;
  rate: number;
  /** What a collection, an occasion or any other packed box is worth. A
   *  ₦500 wrap and a ₦80,000 care package are not the same sale. */
  boxRate: number;
  /** Their own wording for a nudge, or the one everybody starts with. */
  nudge: string;
  /** Where their money goes. Kept by them, read by you. */
  bank: { name: string; accountName: string; accountNumber: string };
  runs: PromoterRun[];
  /** Everything earned across every run. */
  earned: number;
  /** What has been handed over so far. */
  paid: number;
  owed: number;
  /** What the unpaid orders would be worth if every one of them paid. */
  waiting: number;
  /** Those orders, in runs still open, so a nudge can still land. */
  chase: ChaseableOrder[];
  /**
   * Carts their own customers filled in and never paid for. Only people
   * already bound to this promoter: a cart from somebody who has never
   * ordered belongs to nobody yet, and handing it out would be handing out a
   * stranger's number.
   */
  carts: AbandonedCart[];
  payouts: {
    id: string;
    amount: number;
    note: string;
    paid_at: string;
    /** Which run it was for, and what that run is called. */
    batch_id: string | null;
    runLabel: string;
    /** When they said it landed. Null until they do. */
    confirmed_at: string | null;
  }[];
};

/**
 * What a promoter has earned, run by run. Commission is per paid order at that
 * promoter's own rate: an order that never got paid for never travelled, so it
 * earns nothing.
 *
 * Every paid order counts, not only the customers who came through them. That
 * is deliberate while there is one promoter: one person is out marketing the
 * whole shop, so the whole shop is theirs. It is the arrangement, not an
 * oversight, and the admin page is built the same way.
 *
 * It stops being right the moment there are two. Both would be credited for
 * every order and the same sale would be paid for twice. The answer is already
 * in the data: `customers.promoter_code` is written on a first order and never
 * overwritten, so orders can be attributed by matching `customer_phone` back
 * to that column. Admin warns when a second promoter appears, so nobody finds
 * this out from a payout.
 */
export async function promoterEarnings(code: string): Promise<PromoterEarnings | null> {
  const { data: promoter } = await db()
    .from("promoters")
    // Every column. Naming them means adding one here and forgetting the
    // column makes the whole row come back empty.
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!promoter) return null;

  const rate = promoter.rate as number;
  // Older shops have no column for it, and a promoter earning the ordinary
  // rate on a box is better than a page that will not load.
  const boxRate = Number((promoter as { box_rate?: number }).box_rate ?? rate) || rate;

  // Their customers, and only theirs. Every paid order used to count
  // towards whoever this page happened to read first, which is fine for one
  // person marketing the whole shop and wrong the moment there are two: both
  // would be credited for the same sale.
  const { data: theirs } = await db()
    .from("customers")
    .select("phone")
    .eq("promoter_code", promoter.code);
  const mineOnly = new Set(
    ((theirs ?? []) as { phone: string }[]).map((one) => one.phone)
  );

  const { data: everyOrder } = await db()
    .from("orders")
    .select("id, batch_id, status, customer_name, customer_phone, total, box_id")
    // Refunded money went back and cancelled never left, so neither is a
    // sale anybody brought in and neither earns a commission.
    .not("status", "in", NOT_ORDERS_SQL);

  const orders = ((everyOrder ?? []) as { customer_phone: string }[]).filter((one) =>
    mineOnly.has(one.customer_phone)
  ) as typeof everyOrder;

  const batchIds = [...new Set((orders ?? []).map((o) => o.batch_id as string))];
  const { data: batches } = batchIds.length
    ? await db()
        .from("batches")
        .select("id, run_date, slot, status, stage, cut_off_at")
        .in("id", batchIds)
        .order("run_date", { ascending: false })
    : { data: [] };

  const { data: payoutRows } = await db()
    .from("promoter_payouts")
    .select("id, amount, note, paid_at, confirmed_at, batch_id")
    .eq("promoter_code", promoter.code)
    .order("paid_at", { ascending: false });

  // Carts filled in and never paid for. The same list admin calls Left
  // behind: the promoter is the one who knows these people, so they are the
  // one who can ask.
  const settings = await safeSettings();
  const carts: AbandonedCart[] = (
    await abandonedCarts(settings.abandon_minutes || 45).catch(() => [])
  ).map((cart) => ({
    id: cart.id,
    name: cart.name,
    phone: cart.phone,
    items: cart.items,
    value: cart.value,
    summary: cart.summary,
  }));

  const paidPerRun = new Map<string, number>();
  for (const row of (payoutRows ?? []) as any[]) {
    if (!row.batch_id) continue;
    paidPerRun.set(row.batch_id, (paidPerRun.get(row.batch_id) ?? 0) + row.amount);
  }

  const runs: PromoterRun[] = ((batches ?? []) as any[]).map((batch) => {
    const mine = (orders ?? []).filter((o) => o.batch_id === batch.id);
    const paid = mine.filter((o) => isPaid(o.status));
    // A box is a box whichever shelf it came off: a collection, an occasion,
    // a gift. The order says which box it was, and that is the whole test.
    const boxes = paid.filter((o) => Boolean((o as { box_id?: string | null }).box_id));
    return {
      batchId: batch.id as string,
      runDate: batch.run_date as string,
      slot: batch.slot as BatchSlot,
      label: `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot as BatchSlot]}`,
      orders: paid.length,
      unpaid: mine.length - paid.length,
      boxes: boxes.length,
      earned: (paid.length - boxes.length) * rate + boxes.length * boxRate,
      people: paid.map((o) => firstName(String(o.customer_name ?? ""))).filter(Boolean),
      paidOut: paidPerRun.get(batch.id as string) ?? 0,
    };
  });

  // Only worth chasing while the run can still take the money. Once a run has
  // closed, the order has to be moved before anyone can pay for it, and that
  // is not something a promoter can do.
  const stillOpen = new Set(
    ((batches ?? []) as any[])
      .filter(
        (batch) =>
          batch.status === "open" &&
          batch.stage === "ordering" &&
          new Date(batch.cut_off_at).getTime() > Date.now()
      )
      .map((batch) => batch.id as string)
  );

  const byBatch = new Map(
    ((batches ?? []) as any[]).map((batch) => [
      batch.id as string,
      `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot as BatchSlot]}`,
    ])
  );

  const chase: ChaseableOrder[] = (orders ?? [])
    .filter((o) => o.status === "pending" && stillOpen.has(o.batch_id as string))
    .map((o) => ({
      id: o.id as string,
      name: (o.customer_name as string) || "Someone",
      phone: o.customer_phone as string,
      total: o.total as number,
      label: byBatch.get(o.batch_id as string) ?? "",
    }));

  const payouts = ((payoutRows ?? []) as any[]).map((row) => ({
    ...row,
    runLabel: row.batch_id ? byBatch.get(row.batch_id) ?? "" : "",
  }));

  const earned = runs.reduce((total, run) => total + run.earned, 0);
  const paid = payouts.reduce((total, row) => total + (row.amount as number), 0);

  return {
    code: promoter.code as string,
    name: promoter.name as string,
    rate,
    boxRate,
    nudge: ((promoter.nudge_template as string) || "").trim() || NUDGE_DEFAULT,
    bank: {
      name: (promoter.bank_name as string) ?? "",
      accountName: (promoter.bank_account_name as string) ?? "",
      accountNumber: (promoter.bank_account_number as string) ?? "",
    },
    runs,
    earned,
    paid,
    owed: Math.max(0, earned - paid),
    waiting: chase.length * rate,
    chase,
    carts,
    payouts: payouts as PromoterEarnings["payouts"],
  };
}

/**
 * The people somebody could have heard about the shop from.
 *
 * Only the active ones, and only their name and code: the checkout is asking
 * a customer a question, not showing them a staff list, so what they earn and
 * how they sign in stay out of it.
 */
export async function namedPromoters(): Promise<{ code: string; name: string }[]> {
  const { data, error } = await db()
    .from("promoters")
    .select("code, name")
    .eq("active", true)
    .order("name");
  if (error) return [];
  return ((data ?? []) as { code: string; name: string }[]).filter(
    (one) => one.name.trim() !== ""
  );
}

/** Whether that code belongs to somebody currently promoting. */
export async function realPromoter(code: string): Promise<boolean> {
  if (code.trim() === "") return false;
  const { data } = await db()
    .from("promoters")
    .select("code")
    .eq("code", code.trim())
    .eq("active", true)
    .maybeSingle();
  return Boolean(data);
}

/**
 * The name somebody would be called out loud.
 *
 * A promoter asking who ordered is asking whether their two friends came
 * through. They do not need a surname or a number to know that, and handing
 * one over would be handing out somebody else's details for nothing.
 */
function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}
