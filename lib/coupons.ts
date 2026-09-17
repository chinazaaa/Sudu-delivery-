import { db } from "./supabase";
import { naira } from "./money";
import { SLOT_LABEL, type BatchSlot } from "./config";
import { runDateLabel } from "./time";

export type Coupon = {
  code: string;
  applies_to: "delivery" | "order";
  amount: number;
  note: string;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used: number;
  first_order_only: boolean;
};

export type CouponWithRuns = Coupon & {
  /** The runs it works on. Empty means every run. */
  runs: { batchId: string; label: string }[];
};

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; error: string };

/**
 * A discount code, checked against the order it is being used on. Nothing here
 * touches the promoter: a code is a thing to put in a group chat on a slow
 * night, not a way of counting who brought whom.
 */
export async function checkCoupon(args: {
  code: string;
  fee: number;
  food: number;
  returning: boolean;
  /** The run being ordered into, for a code tied to particular ones. */
  batchId: string;
}): Promise<CouponCheck> {
  const wanted = args.code.trim().toUpperCase();
  if (!wanted) return { ok: false, error: "Enter a code." };

  const { data } = await db()
    .from("coupons")
    .select("*")
    .eq("code", wanted)
    .maybeSingle();

  const coupon = data as Coupon | null;
  if (!coupon || !coupon.active) {
    return { ok: false, error: "That code is not in use." };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return { ok: false, error: "That code has expired." };
  }
  if (coupon.max_uses !== null && coupon.used >= coupon.max_uses) {
    return { ok: false, error: "That code has been used up." };
  }
  if (coupon.first_order_only && args.returning) {
    return { ok: false, error: "That code is for a first order only." };
  }

  // A code tied to particular runs works on those and nowhere else. No rows
  // at all means it works on any run.
  const { data: runs } = await db()
    .from("coupon_runs")
    .select("batch_id")
    .eq("coupon_code", coupon.code);

  if ((runs ?? []).length > 0 && !runs!.some((row) => row.batch_id === args.batchId)) {
    return { ok: false, error: "That code is not for this run." };
  }

  // Delivery codes never pay out more than the delivery being charged: "free
  // delivery" on a ₦2,000 top-up is ₦2,000 off, not ₦4,000.
  const ceiling = coupon.applies_to === "delivery" ? args.fee : args.food + args.fee;
  const discount = Math.min(coupon.amount, ceiling);

  if (discount <= 0) {
    return {
      ok: false,
      error:
        coupon.applies_to === "delivery"
          ? "There is no delivery on this order to take off."
          : "There is nothing to take off this order.",
    };
  }

  return { ok: true, coupon, discount };
}

/** Counts a use, once the order it was used on exists. */
export async function useCoupon(code: string): Promise<void> {
  const { data } = await db()
    .from("coupons")
    .select("used")
    .eq("code", code)
    .maybeSingle();
  if (!data) return;

  await db()
    .from("coupons")
    .update({ used: (data.used as number) + 1 })
    .eq("code", code);
}

/** What a code is worth, in words, for the box the customer types it into. */
export function couponLabel(coupon: Coupon): string {
  return coupon.applies_to === "delivery"
    ? `${naira(coupon.amount)} off delivery`
    : `${naira(coupon.amount)} off the order`;
}

export async function listCoupons(): Promise<CouponWithRuns[]> {
  const { data, error } = await db()
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const coupons = (data ?? []) as Coupon[];
  if (coupons.length === 0) return [];

  const { data: links } = await db()
    .from("coupon_runs")
    .select("coupon_code, batch_id");
  const batchIds = [...new Set((links ?? []).map((row) => row.batch_id as string))];

  const { data: batches } = batchIds.length
    ? await db().from("batches").select("id, run_date, slot").in("id", batchIds)
    : { data: [] };
  const labels = new Map(
    ((batches ?? []) as any[]).map((batch) => [
      batch.id as string,
      `${runDateLabel(batch.run_date)} · ${SLOT_LABEL[batch.slot as BatchSlot]}`,
    ])
  );

  return coupons.map((coupon) => ({
    ...coupon,
    runs: (links ?? [])
      .filter((row) => row.coupon_code === coupon.code)
      .map((row) => ({
        batchId: row.batch_id as string,
        label: labels.get(row.batch_id as string) ?? "A past run",
      })),
  }));
}
