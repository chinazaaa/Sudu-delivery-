import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { abandonedCarts } from "@/lib/carts";
import { safeSettings } from "@/lib/settings";
import { clockLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import {
  alreadyTold,
  cartsLeftAlert,
  markTold,
  tellAdmin,
  toldKey,
  unpaidRunAlert,
} from "@/lib/admin-alerts";

export const dynamic = "force-dynamic";

/** How close to a cut-off counts as "closing", in minutes. */
const CLOSING_WITHIN = 90;

/**
 * The two alerts that cannot be sent from a request.
 *
 * Everything else buzzes the phone from the place it happens: an order sends
 * from the checkout, a parcel from the parcel form. These two are about
 * something not happening, so nothing calls them. A cart is abandoned by
 * forty-five minutes of silence and a run is a worry because its cut-off is
 * ninety minutes away and the money is not in, and neither of those is an
 * event anybody fires.
 *
 * Run every quarter of an hour by Vercel's scheduler. That means it looks at
 * the same carts and the same runs ninety-six times a day, so what has been
 * said is written down in admin_alerts_told and never said twice. A phone
 * that buzzes about the same cart every fifteen minutes is a phone with
 * notifications switched off by the morning.
 *
 * Nothing here changes anything. No order is marked paid, no cart is handled,
 * no run is closed. It reads and it tells somebody.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  // Refused outright when no secret is set, rather than running openly. The
  // older cron routes here skip the check when it is unset, which was fine
  // for a route that only sent an email to the shop's own address. This one
  // buzzes a phone, and an open URL that buzzes a phone is a URL somebody
  // refreshes for fun.
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  }
  const given =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (given !== secret) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  }

  const told: string[] = [];

  // Carts nobody finished.
  try {
    const minutes = (await safeSettings()).abandon_minutes || 45;
    const carts = await abandonedCarts(minutes);
    // Only the ones nothing has been said about. A cart stays on the admin
    // page until somebody deals with it, which is right for a list and wrong
    // for a notification.
    const fresh: typeof carts = [];
    for (const cart of carts) {
      if (!(await alreadyTold(toldKey("cart", cart.id)))) fresh.push(cart);
    }

    if (fresh.length > 0) {
      await tellAdmin(
        cartsLeftAlert(
          fresh.map((cart) => ({ name: cart.name, value: cart.value, items: cart.items }))
        )
      );
      // Marked whether or not a phone was reached, for the same reason the
      // abandoned-cart email marks its carts: a shop with no phone subscribed
      // must not build up a backlog that all fires the day one is.
      for (const cart of fresh) {
        await markTold(toldKey("cart", cart.id));
        told.push(toldKey("cart", cart.id));
      }
    }
  } catch {
    /* One alert failing must not take the other down with it. */
  }

  // Runs closing with money still outstanding.
  try {
    const now = Date.now();
    const { data } = await db()
      .from("batches")
      .select("id, run_date, slot, cut_off_at, status, kind")
      .eq("status", "open")
      .gte("cut_off_at", new Date(now).toISOString())
      .lte("cut_off_at", new Date(now + CLOSING_WITHIN * 60_000).toISOString());

    const runs = (data ?? []) as {
      id: string;
      slot: keyof typeof SLOT_LABEL;
      cut_off_at: string;
      kind: string | null;
    }[];

    for (const run of runs) {
      const key = toldKey("run-unpaid", run.id);
      if (await alreadyTold(key)) continue;

      const { data: unpaid } = await db()
        .from("orders")
        .select("total")
        .eq("batch_id", run.id)
        .eq("status", "pending");

      const rows = (unpaid ?? []) as { total: number }[];
      // Nothing outstanding is nothing to say, and it is still marked: the
      // run closes within the hour and a late order on it is an order the
      // new-order notification already covered.
      if (rows.length > 0) {
        await tellAdmin(
          unpaidRunAlert({
            label: SLOT_LABEL[run.slot] ?? "next",
            closes: clockLabel(run.cut_off_at),
            orders: rows.length,
            total: rows.reduce((sum, row) => sum + (row.total ?? 0), 0),
          })
        );
      }
      await markTold(key);
      told.push(key);
    }
  } catch {
    /* Same again: read-only work, and silence is the safe failure. */
  }

  return NextResponse.json({ told: told.length });
}
