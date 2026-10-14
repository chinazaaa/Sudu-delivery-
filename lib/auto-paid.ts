import { db } from "./supabase";
import { readAlert, likelyOrders } from "./alerts";
import { safeSettings } from "./settings";
import { unpaidOrdersForMatching } from "./admin-data";

/**
 * A payment alert marking its own order paid.
 *
 * Off unless somebody has turned it on, and deliberately narrow when it is
 * on. A forged alert cannot put money in the account, but it can put food
 * in a car, so the rule is that there must be exactly one unpaid order for
 * exactly that amount. Two orders at seven thousand on the same run stay a
 * suggestion for a person, which is how this has always worked and is the
 * right answer when the shop cannot tell which is which either.
 *
 * Nothing here guesses at a name. The amount is the whole claim: the
 * narration never survives the forwarding, and a name on a transfer is the
 * payer's bank spelling of somebody who may not be the customer at all.
 *
 * It writes down how it happened, so the books can always say which
 * payments a person confirmed and which the inbox did.
 */
export async function maybeMarkPaid(letter: {
  subject: string;
  text_body: string;
  to_addr: string;
}): Promise<{ marked: string } | null> {
  try {
    const settings = await safeSettings();
    if (String(settings.auto_paid ?? "") !== "on") return null;

    const said = readAlert(letter.subject, letter.text_body);
    if (!said) return null;

    const unpaid = await unpaidOrdersForMatching();
    const could = likelyOrders(said, unpaid, Date.now(), `${letter.subject} ${letter.text_body}`);

    // One, and only one. Anything else is a question, and a question
    // answered by a machine is a question answered wrongly half the time.
    if (could.length !== 1) return null;

    const one = could[0];
    const { error } = await db()
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payment_ref: `Catlog · ${said.payer}, automatic`.slice(0, 120),
      })
      .eq("id", one.id)
      // Still pending at the moment of writing, so two alerts arriving
      // together cannot both claim the same order.
      .eq("status", "pending");
    if (error) return null;

    return { marked: one.orderNo ? `#${one.orderNo}` : one.id.slice(0, 7) };
  } catch {
    // An alert that cannot be matched is an alert sitting in the inbox,
    // which is exactly where it was before any of this existed.
    return null;
  }
}
