import { db } from "./supabase";
import { boxById, cartOf } from "./boxes";
import { tripForBox } from "./box-day";
import { placeOrder } from "./orders";
import { safeSettings } from "./settings";
import { numberOr } from "./settings";
import { lagosToday } from "./time";
import type { CartLine } from "./types";

/**
 * A standing order, for the one customer who has money and comes back.
 *
 * A parent is not a student. They buy the same thing at the same point
 * every month, they are the only people who ever find this shop through
 * Google, and the whole of that used to be a WhatsApp conversation and
 * somebody's memory: "set up a recurring order on WhatsApp" is a promise to
 * remember rather than a subscription.
 *
 * Nothing here charges anybody. There is no card on file in this shop and
 * nothing pretends otherwise: what a plan does is raise an ordinary order
 * on a fixed day, a few days before it lands, so there is a real order with
 * a real total for the parent to pay by transfer in the usual way. The
 * predictable part is the shop's, not the bank's.
 *
 * And the order it raises is an ordinary order. The run sheet, the counter
 * list, the PIN, the receipt and every figure on the profit page carry on
 * knowing nothing about any of this: a plan is a reason an order exists,
 * never a second kind of order.
 */
export type Plan = {
  id: string;
  /** Whoever pays, which is the parent. */
  customerName: string;
  customerPhone: string;
  /** Whoever eats, which is the student. */
  forName: string;
  forPhone: string;
  hostel: string;
  /** A box off the shelf, or last month's order copied forward. */
  boxId: string | null;
  fromOrderId: string | null;
  every: "monthly" | "fortnightly" | "weekly";
  /** The day of the month it lands, for a monthly plan. A fixed day is the
   *  whole point: a parent who knows the food arrives on the 3rd stops
   *  wondering whether it will. */
  onDay: number;
  active: boolean;
  /** Raised without anybody pressing anything. */
  auto: boolean;
  /** Nothing lands while this stands. Campus empties out every holiday. */
  pausedUntil: string | null;
  startedOn: string;
  /** The last landing raised, so nothing is raised twice and nothing is
   *  quietly put back after somebody deleted it on purpose. */
  madeThrough: string | null;
  note: string;
  createdAt: string;
};

/** How many days before it lands the order is raised, so the parent has
 *  time to pay and the shopping has time to be bought. */
export const LEAD_DAYS = 5;

const EVERY: Plan["every"][] = ["monthly", "fortnightly", "weekly"];

function toPlan(row: Record<string, unknown>): Plan {
  const every = String(row.every ?? "monthly");
  return {
    id: String(row.id ?? ""),
    customerName: String(row.customer_name ?? ""),
    customerPhone: String(row.customer_phone ?? ""),
    forName: String(row.for_name ?? ""),
    forPhone: String(row.for_phone ?? ""),
    hostel: String(row.hostel ?? ""),
    boxId: (row.box_id as string | null) ?? null,
    fromOrderId: (row.from_order_id as string | null) ?? null,
    every: (EVERY as string[]).includes(every) ? (every as Plan["every"]) : "monthly",
    onDay: Math.min(28, Math.max(1, Math.round(Number(row.on_day ?? 1)) || 1)),
    active: row.active === true,
    auto: row.auto === true,
    pausedUntil: (row.paused_until as string | null) ?? null,
    startedOn: String(row.started_on ?? ""),
    madeThrough: (row.made_through as string | null) ?? null,
    note: String(row.note ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

/* ------------------------------------------------------------- the days */

const shift = (day: string, by: number): string => {
  const at = new Date(`${day}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + by);
  return at.toISOString().slice(0, 10);
};

/**
 * The next day this plan should land on, strictly after the one given.
 *
 * Capped at the 28th rather than clamped to the end of the month. A plan
 * set to the 31st would land on the 31st, then the 28th, then the 30th,
 * which is not a fixed day and is the opposite of the thing being sold.
 */
export function nextLanding(plan: Plan, after: string): string {
  if (plan.every === "weekly" || plan.every === "fortnightly") {
    const step = plan.every === "weekly" ? 7 : 14;
    let day = plan.startedOn || after;
    // A guard rather than a condition: a bad date must not become a loop.
    for (let guard = 0; guard < 400 && day <= after; guard += 1) {
      day = shift(day, step);
    }
    return day;
  }

  const day = Math.min(28, Math.max(1, plan.onDay));
  const at = new Date(`${after}T12:00:00Z`);
  const same = `${after.slice(0, 7)}-${String(day).padStart(2, "0")}`;
  if (same > after) return same;

  const next = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, day, 12));
  return next.toISOString().slice(0, 10);
}

/**
 * Whether this plan is held for the holidays, its own or the shop's.
 *
 * Campus empties out three times a year, and a care package landing at an
 * empty block is a bag on a step. One field stops every plan at once,
 * because a term ending is not news about one parent.
 */
export function heldUntil(plan: Plan, shopPause: string): string {
  const mine = plan.pausedUntil ?? "";
  return mine > shopPause ? mine : shopPause;
}

/**
 * Every landing this plan owes, soonest first.
 *
 * Owed means the day is close enough to be raised now: the landing itself
 * plus the lead, because an order raised on the morning it lands is an
 * order nobody has had a chance to pay for and shopping nobody has bought.
 *
 * Anything that falls inside a pause is not owed and never will be: the
 * month simply does not happen, and the watermark steps past it so it is
 * not raised in January as though it were still due.
 */
export function owed(
  plan: Plan,
  today: string,
  lead: number,
  shopPause: string
): { raise: string[]; skip: string[] } {
  const raise: string[] = [];
  const skip: string[] = [];
  if (!plan.active) return { raise, skip };

  const held = heldUntil(plan, shopPause);
  const reach = shift(today, Math.max(0, lead));

  let from = plan.madeThrough ?? shift(plan.startedOn || today, -1);
  for (let guard = 0; guard < 60; guard += 1) {
    const land = nextLanding(plan, from);
    if (land > reach) break;
    /*
     * A day already gone is gone.
     *
     * Without this a plan set up today, starting on the first, owed the
     * third of this month the moment it was switched on, and a plan the
     * shop had held for a term came back owing every month of it at once.
     * The watermark steps over them so they are not asked about again.
     */
    if (land < today || (held !== "" && land <= held)) skip.push(land);
    else raise.push(land);
    from = land;
  }

  return { raise, skip };
}

/* ------------------------------------------------------------ the rows */

export async function allPlans(): Promise<Plan[]> {
  try {
    const { data, error } = await db()
      .from("plans")
      .select("*")
      .order("active", { ascending: false })
      .order("on_day", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map(toPlan);
  } catch {
    return [];
  }
}

export async function planById(id: string): Promise<Plan | null> {
  try {
    const { data } = await db().from("plans").select("*").eq("id", id).maybeSingle();
    return data ? toPlan(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** What a plan has already raised, newest first, for the page that shows it. */
export async function planOrders(
  planId: string
): Promise<{ cycle: string; orderId: string; ref: string; status: string; total: number }[]> {
  try {
    const { data } = await db()
      .from("plan_orders")
      .select("cycle, order_id")
      .eq("plan_id", planId)
      .order("cycle", { ascending: false })
      .limit(24);

    const rows = (data ?? []) as { cycle: string; order_id: string }[];
    if (rows.length === 0) return [];

    const { data: orders } = await db()
      .from("orders")
      .select("id, order_no, short, status, total")
      .in("id", rows.map((one) => one.order_id));

    const by = new Map(
      ((orders ?? []) as Record<string, unknown>[]).map((one) => [String(one.id), one])
    );

    return rows.map((row) => {
      const order = by.get(row.order_id);
      return {
        cycle: row.cycle,
        orderId: row.order_id,
        ref: order?.order_no ? `#${order.order_no}` : row.order_id.slice(0, 6),
        status: String(order?.status ?? "gone"),
        total: Number(order?.total ?? 0),
      };
    });
  } catch {
    return [];
  }
}

/* --------------------------------------------------------- the raising */

/** What goes in the box this month, as lines a checkout understands. */
async function linesFor(plan: Plan): Promise<CartLine[] | { error: string }> {
  if (plan.boxId) {
    const box = await boxById(plan.boxId);
    if (!box) return { error: "The box this plan is for has gone." };
    return cartOf(box);
  }

  if (plan.fromOrderId) {
    const { data } = await db()
      .from("order_items")
      .select("id, menu_item_id, qty")
      .eq("order_id", plan.fromOrderId);

    const rows = (data ?? []) as { id: string; menu_item_id: string; qty: number }[];
    if (rows.length === 0) return { error: "The order this plan copies has gone." };

    const { data: chose } = await db()
      .from("order_item_options")
      .select("order_item_id, option_id")
      .in("order_item_id", rows.map((one) => one.id));

    const options = new Map<string, string[]>();
    for (const one of (chose ?? []) as { order_item_id: string; option_id: string }[]) {
      options.set(one.order_item_id, [
        ...(options.get(one.order_item_id) ?? []),
        one.option_id,
      ]);
    }

    return rows.map((row) => ({
      menu_item_id: row.menu_item_id,
      qty: Math.max(1, Number(row.qty ?? 1)),
      option_ids: options.get(row.id) ?? [],
      for_name: null,
    }));
  }

  return { error: "This plan has nothing in it yet." };
}

export type Raised =
  | { ok: true; orderId: string; cycle: string }
  | { ok: false; error: string };

/**
 * One cycle, raised as an ordinary order.
 *
 * Through placeOrder, like every other door into this shop, so the pricing,
 * the PIN, the narration, the run sheet and the receipt are the ones they
 * have always been. The only thing a plan adds is the reason, written on
 * the order where the person packing it will read it.
 *
 * Idempotent by the database rather than by remembering: plan_orders has
 * the pair as its primary key, so two sweeps landing together cannot make
 * two orders for one month.
 */
export async function raiseCycle(plan: Plan, land: string): Promise<Raised> {
  const already = await db()
    .from("plan_orders")
    .select("order_id")
    .eq("plan_id", plan.id)
    .eq("cycle", land)
    .maybeSingle();
  if (already.data) {
    return { ok: true, orderId: String(already.data.order_id), cycle: land };
  }

  const lines = await linesFor(plan);
  if ("error" in lines) return { ok: false, error: lines.error };

  const box = plan.boxId ? await boxById(plan.boxId) : null;

  const trip = await tripForBox(
    land,
    `Plan · ${plan.customerName || "monthly"}`.slice(0, 60)
  );
  if (!trip) return { ok: false, error: "Could not start the trip for it." };

  const placed = await placeOrder({
    batchId: trip.id,
    name: plan.customerName,
    phone: plan.customerPhone,
    hostel: plan.hostel,
    lines,
    source: "web",
    cameFrom: "plan",
    paymentMethod: "transfer",
    boxId: plan.boxId ?? undefined,
    // A box is one price with delivery in it, whichever way it travels.
    ...(box ? { fixedFee: box.run_fee } : {}),
    // The parent pays and keeps every message about money; the student is
    // who the driver rings and whose block it goes to.
    /* Only where it is genuinely somebody else. The same number in both
       is one person, and the checkout refuses a gift to the payer's own
       number, so passing it would fail the whole month's order over
       something nobody meant. */
    ...(plan.forName.trim() !== "" &&
    plan.forPhone.trim() !== "" &&
    plan.forPhone !== plan.customerPhone
      ? { giftTo: { name: plan.forName, phone: plan.forPhone } }
      : {}),
    customerNote: [
      `Monthly plan for ${plan.forName || plan.customerName}.`,
      plan.note.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500),
  });

  if (!placed.ok) return { ok: false, error: placed.error };

  await db()
    .from("plan_orders")
    .insert({ plan_id: plan.id, cycle: land, order_id: placed.orderId });

  await db().from("plans").update({ made_through: land }).eq("id", plan.id);

  return { ok: true, orderId: placed.orderId, cycle: land };
}

/**
 * Every plan, caught up.
 *
 * Safe to call as often as anything likes, which is what lets it live on
 * the quarter-hourly sweep beside the other alerts: a cycle already raised
 * is refused by the database, and a cycle inside a pause is stepped over
 * rather than stored up.
 *
 * Only the plans marked to raise themselves are raised. The rest are
 * reported as due, because a box is sourced by hand and an order nobody
 * asked for is a bag at a block with nobody to pay for it. Which of their
 * parents is regular enough to trust with that is the shop's decision and
 * nobody else's.
 */
export async function sweepPlans(today = lagosToday()): Promise<{
  raised: { plan: Plan; cycle: string; orderId: string }[];
  due: { plan: Plan; cycle: string }[];
  failed: { plan: Plan; cycle: string; error: string }[];
}> {
  const raised: { plan: Plan; cycle: string; orderId: string }[] = [];
  const due: { plan: Plan; cycle: string }[] = [];
  const failed: { plan: Plan; cycle: string; error: string }[] = [];

  const settings = await safeSettings();
  const lead = Math.max(0, numberOr(settings.plan_lead_days, LEAD_DAYS));
  const shopPause = String(settings.plans_paused_until ?? "").trim();

  for (const plan of await allPlans()) {
    const { raise, skip } = owed(plan, today, lead, shopPause);

    // A month inside the holiday does not happen, and the watermark steps
    // past it so it is not raised in January as though it were still due.
    for (const land of skip) {
      await db().from("plans").update({ made_through: land }).eq("id", plan.id);
    }

    for (const land of raise) {
      if (!plan.auto) {
        due.push({ plan, cycle: land });
        continue;
      }
      const made = await raiseCycle(plan, land);
      if (made.ok) raised.push({ plan, cycle: land, orderId: made.orderId });
      else failed.push({ plan, cycle: land, error: made.error });
    }
  }

  return { raised, due, failed };
}

/** What the whole thing is worth in a month, for the page that shows it.
 *  Counted off what each plan last cost rather than guessed, and silent
 *  where a plan has never run: a figure nobody can check is worse than
 *  no figure. */
export async function monthlyValue(): Promise<{ plans: number; worth: number }> {
  try {
    const { data } = await db()
      .from("plan_orders")
      .select("plan_id, order_id, cycle")
      .order("cycle", { ascending: false })
      .limit(500);

    const rows = (data ?? []) as { plan_id: string; order_id: string }[];
    const latest = new Map<string, string>();
    for (const row of rows) {
      if (!latest.has(row.plan_id)) latest.set(row.plan_id, row.order_id);
    }
    if (latest.size === 0) return { plans: 0, worth: 0 };

    const { data: orders } = await db()
      .from("orders")
      .select("id, total")
      .in("id", [...latest.values()]);

    const worth = ((orders ?? []) as { total: number }[]).reduce(
      (sum, one) => sum + Number(one.total ?? 0),
      0
    );
    return { plans: latest.size, worth };
  } catch {
    return { plans: 0, worth: 0 };
  }
}
