import { randomUUID } from "crypto";

import { db } from "./supabase";
import { recordDeletion } from "./deletions";

/**
 * Delete everything that says who somebody is.
 *
 * Both app stores require a person to be able to get rid of their own
 * record from inside the app, and it is the right thing anyway, so it is
 * not the app's alone: the website asks the same question of the same
 * function. Somebody who ordered on a phone browser should not have to
 * message a human and wait to be believed.
 *
 * What goes is everything that identifies them: the customer record with
 * their name, block and PIN, any phone registered for notifications, any
 * cart left behind, and their name and number on past orders and groups.
 *
 * What stays is the bare record of past sales with no name on it, because
 * the shop has to account for money that changed hands. That is exactly
 * what the privacy policy promises.
 *
 * It is refused only while food is actually in flight. An order paid for
 * and not yet handed out still has to reach somebody, and a bag with no
 * name on it reaches nobody. They are told to come back once it has
 * arrived, which is a wait of hours rather than a refusal.
 */
export type Forgotten =
  | { ok: true; orders: number }
  | { ok: false; error: string; stillComing?: boolean };

export async function forgetCustomer(
  phone: string,
  /** How they asked, for the line admin reads afterwards. */
  how: "the app" | "the website"
): Promise<Forgotten> {
  if (!phone) return { ok: false, error: "Sign in first." };

  try {
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
        return {
          ok: false,
          stillComing: true,
          error:
            "You have an order still on its way. We cannot deliver a bag with " +
            "no name on it, so come back once it has arrived and this will go " +
            "through straight away.",
        };
      }
    }

    // One token for this person, so past orders stay countable as one
    // customer's without saying who that customer was. An empty string
    // would quietly heap every deleted person together.
    const gone = `deleted-${randomUUID().slice(0, 8)}`;

    await db()
      .from("orders")
      .update({ customer_name: "Deleted", customer_phone: gone, for_name: null })
      .eq("customer_phone", phone);

    await db()
      .from("order_groups")
      .update({ leader_phone: gone })
      .eq("leader_phone", phone);
    await db()
      .from("group_members")
      .update({ phone: "", hostel: "", name: "Deleted" })
      .eq("phone", phone);
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
        `Closed their account from ${how}. ${rows.length} past order` +
        `${rows.length === 1 ? "" : "s"} kept, with the name taken off.`,
      body: person ?? { phone },
    });

    return { ok: true, orders: rows.length };
  } catch {
    return {
      ok: false,
      error:
        "Could not delete that just now. Message us and we will do it by hand.",
    };
  }
}
