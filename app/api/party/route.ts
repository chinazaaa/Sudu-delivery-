import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { createSameDayBatch, getBatch, isOrderable } from "@/lib/batches";
import { deliveryHours, safeSettings } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { SHARE_MINUTES } from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * Make a group, there and then.
 *
 * A link used to be a string in somebody's browser that meant nothing until
 * the first person ordered, so there was no group to look at, no list of who
 * had joined, and no answer to "when is it coming". The group is real from the
 * moment it is made now, and it already knows which car it is.
 *
 * Whoever makes it picks the car. That is the whole reason the waiting-on-the-
 * leader state existed, and it does not need to exist.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      name?: string;
      batchId?: string;
      deliverAt?: string;
    };

    const name = String(body.name ?? "").trim().slice(0, 40);
    if (name.length < 2) {
      return NextResponse.json({ error: "Tell us your first name." }, { status: 400 });
    }

    let batch = null;

    if (body.deliverAt) {
      if ((await safeSettings()).same_day_on !== "on") {
        return NextResponse.json({ error: "Pick a run instead." }, { status: 400 });
      }
      const slot = deliverySlots(new Date(), await deliveryHours()).find(
        (one) => one.at === body.deliverAt
      );
      if (!slot) {
        return NextResponse.json({ error: "That time has gone." }, { status: 400 });
      }
      batch = await createSameDayBatch({
        deliverAt: slot.at,
        label: slot.day === "today" ? `Today, ${slot.label}` : slot.label,
      });
    } else {
      batch = await getBatch(String(body.batchId ?? ""));
      if (!batch || !isOrderable(batch)) {
        return NextResponse.json({ error: "That run has closed." }, { status: 400 });
      }
    }

    if (!batch) {
      return NextResponse.json(
        { error: "Could not get a car for that time. Try another time, or a run." },
        { status: 500 }
      );
    }

    // Open for a quarter of an hour, and on a run never past that run's own
    // cut off, because a group that outlived its run would collect people for
    // a car that had already gone.
    //
    // A same day car carries no such limit. Its cut off is stamped at the
    // moment it is made, so capping against it would close the group in the
    // same breath as making it, and nobody would ever get in.
    const wanted = Date.now() + SHARE_MINUTES * 60_000;
    const closesAt = new Date(
      batch.kind === "same_day"
        ? wanted
        : Math.min(wanted, new Date(batch.cut_off_at).getTime())
    ).toISOString();

    const { data, error } = await db()
      .from("order_groups")
      .insert({
        batch_id: batch.id,
        leader_phone: "",
        leader_name: name,
        hostel: "",
        mode: "split",
        collect_mode: "each",
        closes_at: closesAt,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("party insert failed:", error?.message);
      return NextResponse.json({ error: "Could not start that group." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, when: batch.delivery_window_text });
  } catch {
    return NextResponse.json({ error: "Could not start that group." }, { status: 500 });
  }
}
