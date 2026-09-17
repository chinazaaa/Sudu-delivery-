import { db } from "./supabase";
import { SLOT_LABEL, type BatchSlot } from "./config";
import { runDateLabel } from "./time";

/** The promoter behind a ?ref= code, if it is a live one. */
export async function activePromoter(
  code: string | null | undefined
): Promise<{ code: string; name: string } | null> {
  if (!code) return null;
  const { data } = await db()
    .from("promoters")
    .select("code, name")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();
  return data ? { code: data.code as string, name: data.name as string } : null;
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

export type PromoterEarnings = {
  code: string;
  name: string;
  rate: number;
  runs: PromoterRun[];
  /** Everything earned across every run. */
  earned: number;
  /** What has been handed over so far. */
  paid: number;
  owed: number;
  payouts: { id: string; amount: number; note: string; paid_at: string }[];
};

/**
 * What a promoter has earned, run by run. Commission is per paid order at that
 * promoter's own rate: an order that never got paid for never travelled, so it
 * earns nothing.
 */
export async function promoterEarnings(code: string): Promise<PromoterEarnings | null> {
  const { data: promoter } = await db()
    .from("promoters")
    .select("code, name, rate")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (!promoter) return null;

  const rate = promoter.rate as number;

  const { data: orders } = await db()
    .from("orders")
    .select("batch_id, status")
    .eq("promoter_code", promoter.code)
    .neq("status", "refunded");

  const batchIds = [...new Set((orders ?? []).map((o) => o.batch_id as string))];
  const { data: batches } = batchIds.length
    ? await db()
        .from("batches")
        .select("id, run_date, slot")
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

  const { data: payouts } = await db()
    .from("promoter_payouts")
    .select("id, amount, note, paid_at")
    .eq("promoter_code", promoter.code)
    .order("paid_at", { ascending: false });

  const earned = runs.reduce((total, run) => total + run.earned, 0);
  const paid = (payouts ?? []).reduce((total, row) => total + (row.amount as number), 0);

  return {
    code: promoter.code as string,
    name: promoter.name as string,
    rate,
    runs,
    earned,
    paid,
    owed: Math.max(0, earned - paid),
    payouts: (payouts ?? []) as PromoterEarnings["payouts"],
  };
}
