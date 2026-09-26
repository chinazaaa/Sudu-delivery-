import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/supabase";
import { recordDeletion } from "@/lib/deletions";
import { phoneFromToken } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

/**
 * Delete everything that says who somebody is.
 *
 * Both app stores require a person to be able to get rid of their own record
 * from inside the app, and it is the right thing anyway. What goes is
 * everything that identifies them: the customer record with their name,
 * block and PIN, any phone registered for notifications, any cart they left
 * behind, and their name and number on past orders and groups.
 *
 * What stays is the bare record of past sales with no name on it, because we
 * have to be able to account for money that changed hands. That is exactly
 * what the privacy policy promises.
 *
 * It is refused only while food is actually in flight. An order paid for and
 * not yet handed out still has to reach somebody, and a bag with no name on
 * it reaches nobody. They are told to come back once it has arrived, which
 * is a wait of hours, not a refusal.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const header = request.headers.get("authorization");
    const phone = phoneFromToken(header?.replace(/^Bearer /i, "") ?? null);
    if (!phone) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const { data: orders } = await db()
      .from("orders")
      .select("id, batch_id, status")
      .eq("customer_phone", phone);

    const rows = orders ?? [];
    const batchIds = [...new Set(rows.map((row) => row.batch_id as string))];

    if (batchIds.length > 0) {
      const { data: batches } = await db()
        .from("batches")
        .select("id, stage")
        .in("id", batchIds);

      const travelling = new Set(
        (batches ?? [])
          .filter((batch) => batch.stage !== "handed_out")
          .map((batch) => batch.id as string)
      );

      const live = rows.some(
        (row) => row.status !== "refunded" && travelling.has(row.batch_id as string)
      );

      if (live) {
        return NextResponse.json(
          {
            error:
              "You have an order still on its way. We cannot deliver a bag with " +
              "no name on it, so come back once it has arrived and this will go " +
              "through straight away.",
          },
          { status: 409 }
        );
      }
    }

    // One token for this person, so past orders stay countable as one
    // customer's without saying who that customer was. An empty string would
    // quietly heap every deleted person together.
    const gone = `deleted-${randomUUID().slice(0, 8)}`;

    await db()
      .from("orders")
      .update({ customer_name: "Deleted", customer_phone: gone, for_name: null })
      .eq("customer_phone", phone);

    await db().from("order_groups").update({ leader_phone: gone }).eq("leader_phone", phone);
    await db().from("group_members").update({ phone: "", hostel: "", name: "Deleted" }).eq("phone", phone);
    await db().from("carts").delete().eq("phone", phone);
    await db().from("push_devices").delete().eq("phone", phone);
    const { data: person } = await db()
      .from("customers")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    await db().from("customers").delete().eq("phone", phone);

    // Said plainly, because "an order changed name to Deleted overnight" is
    // the kind of thing that looks like a bug at six in the morning.
    await recordDeletion({
      kind: "account",
      label: `${String(person?.name ?? "Somebody")} · ${phone}`,
      who: "customer",
      detail:
        `Closed their account in the app. ${rows.length} past order` +
        `${rows.length === 1 ? "" : "s"} kept, with the name taken off.`,
      body: person ?? { phone },
    });

    return NextResponse.json({ ok: true, orders: rows.length });
  } catch {
    return NextResponse.json(
      { error: "Could not delete that just now. Message us and we will do it by hand." },
      { status: 500 }
    );
  }
}
