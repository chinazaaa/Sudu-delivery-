import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { pushTo } from "@/lib/push";
import { SLOT_LABEL } from "@/lib/config";
import { clockLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/** How long before the cut-off the reminder goes out. */
const WARNING_MINUTES = 90;

/**
 * "Your run closes soon", to the people it costs something.
 *
 * Only two kinds of person are told: somebody with an order on that run who
 * has not paid for it, and somebody who filled a cart for it and never
 * ordered. Everybody else has either paid or never started, and a shop that
 * notifies people who did not ask is a shop people turn notifications off for.
 *
 * Meant to be called on a schedule, the same way the abandoned-cart check is.
 * Each run is told about once: closing_notified_at says so.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const given = new URL(request.url).searchParams.get("key");
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}` && given !== secret) {
      return NextResponse.json({ error: "Not allowed" }, { status: 401 });
    }
  }

  try {
    const now = Date.now();
    const { data: batches } = await db()
      .from("batches")
      .select("id, run_date, slot, cut_off_at, status, closing_notified_at")
      .eq("status", "open")
      .is("closing_notified_at", null)
      .gte("cut_off_at", new Date(now).toISOString())
      .lte("cut_off_at", new Date(now + WARNING_MINUTES * 60_000).toISOString());

    const runs = (batches ?? []) as {
      id: string;
      run_date: string;
      slot: keyof typeof SLOT_LABEL;
      cut_off_at: string;
    }[];

    let told = 0;

    for (const run of runs) {
      // Unpaid orders on this run, and carts that never became one.
      const [{ data: orders }, { data: carts }] = await Promise.all([
        db().from("orders").select("customer_phone").eq("batch_id", run.id).eq("status", "pending"),
        db().from("carts").select("phone").eq("batch_id", run.id).is("converted_at", null),
      ]);

      const phones = [
        ...new Set([
          ...((orders ?? []) as { customer_phone: string }[]).map((row) => row.customer_phone),
          ...((carts ?? []) as { phone: string }[]).map((row) => row.phone),
        ]),
      ].filter(Boolean);

      if (phones.length > 0) {
        const { data: devices } = await db()
          .from("push_devices")
          .select("token")
          .in("phone", phones);

        told += await pushTo(
          ((devices ?? []) as { token: string }[]).map((row) => row.token),
          {
            title: `Closing ${clockLabel(run.cut_off_at)}`,
            body: `The ${SLOT_LABEL[run.slot]} run closes soon. Pay before then and your food travels.`,
          }
        );
      }

      // Marked whether or not anybody was told, so a quiet run is not
      // revisited every time the schedule fires.
      await db()
        .from("batches")
        .update({ closing_notified_at: new Date().toISOString() })
        .eq("id", run.id);
    }

    return NextResponse.json({ runs: runs.length, told });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send those." },
      { status: 500 }
    );
  }
}
