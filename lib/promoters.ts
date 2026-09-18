import { db } from "./supabase";
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
  earned: number;
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

  const { data: orders } = await db()
    .from("orders")
    .select("id, batch_id, status, customer_name, customer_phone, total")
    .neq("status", "refunded");

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
    const paidOrders = mine.filter((o) => o.status !== "pending").length;
    return {
      batchId: batch.id as string,
      runDate: batch.run_date as string,
      slot: batch.slot as BatchSlot,
      label: `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot as BatchSlot]}`,
      orders: paidOrders,
      unpaid: mine.length - paidOrders,
      earned: paidOrders * rate,
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
