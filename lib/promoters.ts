import { db } from "./supabase";
import { SLOT_LABEL, type BatchSlot } from "./config";
import { runDateLabel } from "./time";

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
};

/** An order placed but not paid for, in a run that is still taking money. */
export type ChaseableOrder = {
  id: string;
  name: string;
  phone: string;
  total: number;
  label: string;
};

export type PromoterEarnings = {
  code: string;
  name: string;
  rate: number;
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
  payouts: {
    id: string;
    amount: number;
    note: string;
    paid_at: string;
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
    .select("code, name, rate, bank_name, bank_account_name, bank_account_number")
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

  const { data: payouts } = await db()
    .from("promoter_payouts")
    .select("id, amount, note, paid_at, confirmed_at")
    .eq("promoter_code", promoter.code)
    .order("paid_at", { ascending: false });

  const earned = runs.reduce((total, run) => total + run.earned, 0);
  const paid = (payouts ?? []).reduce((total, row) => total + (row.amount as number), 0);

  return {
    code: promoter.code as string,
    name: promoter.name as string,
    rate,
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
    payouts: (payouts ?? []) as PromoterEarnings["payouts"],
  };
}
