import { db } from "./supabase";
import { emailAdmins } from "./email";
import { renderEmail, renderText, type Block } from "./email-html";
import { siteUrl } from "./admin-templates";
import { naira } from "./money";
import { safeSettings } from "./settings";

/**
 * One email for a shared delivery, sent when it closes.
 *
 * Every order in a group used to send its own the moment it was placed, which
 * was three or four mails in ten minutes, each showing a total that was about
 * to change, for a car nobody could start buying for yet: until the group
 * closes there is no delivery fee and so nobody can pay.
 *
 * Closing is the moment there is something to do. So one mail, with the whole
 * car in it, sent once.
 *
 * Never throws. A notification that fails must not leave a group unclosed
 * after its orders have already been priced.
 */
export async function announceGroup(groupId: string): Promise<void> {
  try {
    const { data: group } = await db()
      .from("order_groups")
      .select("leader_name, batch_id")
      .eq("id", groupId)
      .maybeSingle();
    if (!group) return;

    const { data: orders } = await db()
      .from("orders")
      .select("id, order_no, customer_name, customer_phone, subtotal_food, fee, total")
      .eq("group_id", groupId)
      .neq("status", "refunded")
      .order("created_at");

    const rows = orders ?? [];
    if (rows.length === 0) return;

    const { data: batch } = await db()
      .from("batches")
      .select("delivery_window_text")
      .eq("id", group.batch_id as string)
      .maybeSingle();

    const leader = String(group.leader_name ?? "Somebody");
    const when = (batch?.delivery_window_text as string) ?? "";
    const food = rows.reduce((sum, one) => sum + (one.subtotal_food as number), 0);
    const share = (rows[0]?.fee as number) ?? 0;

    const url = await siteUrl().catch(() => "");
    const link = url ? `${url}/admin/orders` : "";

    const title =
      `${leader}'s group closed · ${rows.length} ` +
      `${rows.length === 1 ? "order" : "orders"} · ${naira(food + share * rows.length)}`;

    const blocks: Block[] = [
      {
        kind: "text",
        text:
          `${leader}'s shared delivery has closed with ${rows.length} ` +
          `${rows.length === 1 ? "person" : "people"} in it` +
          (when ? `, arriving ${when}` : "") +
          `. Each of them pays ${naira(share)} for delivery, on their own order.`,
      },
      ...(link ? [{ kind: "button" as const, label: "Open the orders", href: link }] : []),
      {
        kind: "rows",
        rows: rows.map((one) => ({
          label: `#${one.order_no ?? ""} ${one.customer_name}`,
          value:
            `${naira(one.subtotal_food as number)} food + ` +
            `${naira(one.fee as number)} delivery = ${naira(one.total as number)}`,
        })),
      },
      {
        kind: "text",
        text:
          "Everybody pays their own. Nobody has been sent anything yet: the " +
          "messages go out from the order pages as usual.",
      },
    ];

    const tagline = (await safeSettings()).tagline || undefined;
    await emailAdmins(title, renderText(title, blocks), renderEmail(title, blocks, tagline), "group");
  } catch {
    /* A group that closed correctly must not be undone by a failed email. */
  }
}
