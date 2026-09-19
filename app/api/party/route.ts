import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { takeSeat } from "@/lib/group-carts";
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

    // The quarter of an hour starts at the first order, not here.
    //
    // It used to start here, which meant the person who made the link was
    // racing it: browse the menu, choose, type a name, a number and a block,
    // and the fifteen minutes were gone before their own order was placed. The
    // group closed itself, empty, and their food then went out alone at the
    // full fee with nothing anywhere saying why. Starting the clock at the
    // link is timing the wrong thing. Fifteen minutes is how long friends have
    // to pile into an order that exists, and until somebody has ordered there
    // is nothing to pile into.
    //
    // So this is the outer limit only: the last moment the car itself can
    // take anybody. A same day car is bounded by when it has to leave, and a
    // run by its own cut off.
    const lastCall =
      batch.kind === "same_day" && batch.deliver_at
        ? new Date(batch.deliver_at).getTime()
        : new Date(batch.cut_off_at).getTime();

    // A same day car stamps its cut off at the moment it is made, so a car
    // with no time on it would otherwise close in the same breath.
    const closesAt = new Date(
      Math.max(lastCall, Date.now() + SHARE_MINUTES * 60_000)
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

    // The leader takes the first seat, by the name they just gave. Without
    // this the group page would turn round and ask them who they are, which
    // they have already said.
    const jar = await cookies();
    const token = jar.get("sudu_seat")?.value || randomUUID();
    const keep = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    };
    jar.set("sudu_group", data.id as string, keep);
    jar.set("sudu_seat", token, keep);
    await takeSeat({ groupId: data.id as string, token, name });

    return NextResponse.json({ id: data.id, when: batch.delivery_window_text });
  } catch {
    return NextResponse.json({ error: "Could not start that group." }, { status: 500 });
  }
}
