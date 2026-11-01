import { db } from "./supabase";
import { codeFrom } from "./promoter-applications";

/**
 * Telling a friend, and getting something for it.
 *
 * The whole thing has to survive being explained in one line: send your
 * link, they order, you get ₦2,000 off your next food. Anything with a
 * code to copy out of a notification and type into a box at the checkout
 * is a thing people mean to do and then do not, so there is no typing in
 * it anywhere. Their link carries the code, and their reward is sitting
 * in the checkout when they next open it.
 *
 * It rides on the promoter machinery the shop already runs, because a
 * customer who brings somebody in is doing what a promoter does: the
 * links, the attribution, the "their promoter stays theirs for life" rule
 * on the customer row are all built and all tested. The one difference is
 * what they are paid. A recruited promoter gets cash, counted per order
 * and handed over; a customer gets a voucher off their own next order,
 * which costs us less, comes back as another order, and means there is no
 * payout to run for two hundred people.
 */

/** What a referral is worth, off the referrer's next food. */
export const REFERRAL_REWARD = 2000;

/** How long they have to use it. Long enough not to be a trick, short
 *  enough to be a reason to order. */
export const REWARD_DAYS = 60;

/** What the share message says. One line, their link, nothing else: it is
 *  pasted into a chat, not read as a page. */
export function shareText(code: string, site: string): string {
  return (
    `I order food to PAU with Sudu. Use my link and I get ₦${REFERRAL_REWARD.toLocaleString()} ` +
    `off my next one: ${site}/s/${code.toLowerCase()}`
  );
}

/**
 * Make sure this customer has a code of their own.
 *
 * Called when their first order is paid for, which is the moment they
 * have something to recommend. Doing it at that point rather than at
 * signup means every code in the table belongs to somebody who has
 * actually eaten our food.
 */
export async function enrolCustomer(
  phone: string,
  name: string
): Promise<string> {
  if (!phone) return "";
  try {
    const { data: mine } = await db()
      .from("promoters")
      .select("code")
      .eq("phone", phone)
      .maybeSingle();
    const had = (mine as { code?: string } | null)?.code;
    if (had) return had;

    const { data: all } = await db().from("promoters").select("code");
    const taken = ((all ?? []) as { code: string }[]).map((one) => one.code);
    const code = codeFrom(name, taken);

    await db().from("promoters").insert({
      code,
      handle: code.toLowerCase(),
      name: name.trim() || "A friend",
      phone,
      // Nothing per order: the reward is the voucher, and a rate here as
      // well would be paying twice for one friend.
      rate: 0,
      box_rate: 0,
      active: true,
      is_customer: true,
    });
    return code;
  } catch {
    // No code rather than a half made one. They get one next time.
    return "";
  }
}

/**
 * The wallet, which is the only shape that survives ten friends.
 *
 * A code per friend would be ten codes used one order at a time, and the
 * whole point of this is that it is easy enough to bother with. So it is
 * one number: bring ten people in and you have twenty thousand to spend,
 * and it comes off your food without anybody typing anything.
 *
 * A balance and the moves that made it, the same shape as a promoter's
 * earnings page, because the question people actually ask is not "what is
 * my balance" but "did Tolu's order count". A number with no history
 * behind it cannot answer that.
 */
export type CreditMove = {
  amount: number;
  reason: string;
  friend: string;
  at: string;
};

export type Wallet = { balance: number; moves: CreditMove[] };

/**
 * How much of a balance a given order can take.
 *
 * Off the food, never the delivery: the fee is what holds the trip up and
 * the shop does not discount it. And never more than the food comes to,
 * because an order cannot cost less than nothing and the difference has
 * to stay in the wallet rather than evaporating.
 */
export function creditToUse(balance: number, foodTotal: number): number {
  const have = Math.max(0, Math.floor(balance));
  const bill = Math.max(0, Math.floor(foodTotal));
  return Math.min(have, bill);
}

/** What this number has to spend. */
export async function creditFor(phone: string): Promise<number> {
  if (!phone) return 0;
  try {
    const { data } = await db()
      .from("customers")
      .select("credit")
      .eq("phone", phone)
      .maybeSingle();
    return Math.max(0, Number((data as { credit?: number } | null)?.credit ?? 0));
  } catch {
    // No credit rather than a guessed figure: somebody told they have
    // money they do not have is worse than somebody told nothing.
    return 0;
  }
}

/**
 * Pay somebody for a friend who has just paid for their first order.
 *
 * The unique index on the friend's number is what makes this safe to call
 * twice. A payment marked twice, a retry, a double tap in admin: the
 * second insert fails and the balance is not touched, rather than this
 * having to remember what it already did.
 */
export async function rewardReferrer(args: {
  referrer: string;
  friend: string;
  orderId: string;
}): Promise<boolean> {
  const { referrer, friend, orderId } = args;
  if (!referrer || !friend) return false;
  // Nobody refers themselves. The link is theirs and their own number is
  // the easiest one to put it in front of.
  if (referrer === friend) return false;

  try {
    const { error } = await db().from("credit_moves").insert({
      phone: referrer,
      amount: REFERRAL_REWARD,
      reason: "referral",
      order_id: orderId,
      friend_phone: friend,
    });
    // Already paid for this friend, which is the index doing its job.
    if (error) return false;

    const now = await creditFor(referrer);
    await db()
      .from("customers")
      .update({ credit: now + REFERRAL_REWARD })
      .eq("phone", referrer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Take what an order used out of the wallet.
 *
 * Written as a move of its own so the two sides always add up to the
 * balance: a wallet that says four thousand with one reward and no
 * spending in it is a wallet nobody believes.
 */
export async function spendCredit(args: {
  phone: string;
  amount: number;
  orderId: string;
}): Promise<void> {
  const { phone, amount, orderId } = args;
  if (!phone || amount <= 0) return;
  try {
    const now = await creditFor(phone);
    const taken = Math.min(now, amount);
    if (taken <= 0) return;
    await db().from("customers").update({ credit: now - taken }).eq("phone", phone);
    await db().from("credit_moves").insert({
      phone,
      amount: -taken,
      reason: "spent",
      order_id: orderId,
    });
  } catch {
    /* The order stands. A balance that did not come down is ours to fix,
       and the move that is missing says which one. */
  }
}

/** The wallet as their own page draws it: what is in it and how it got there. */
export async function walletFor(phone: string): Promise<Wallet> {
  if (!phone) return { balance: 0, moves: [] };
  try {
    const [balance, { data }] = await Promise.all([
      creditFor(phone),
      db()
        .from("credit_moves")
        .select("amount, reason, friend_phone, created_at")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const rows = (data ?? []) as {
      amount: number;
      reason: string;
      friend_phone: string | null;
      created_at: string;
    }[];

    // First names, and only for the people they brought in. They did the
    // introducing; they do not own anybody's phone book.
    const numbers = [
      ...new Set(rows.map((one) => one.friend_phone).filter(Boolean) as string[]),
    ];
    const named = new Map<string, string>();
    if (numbers.length > 0) {
      const { data: friends } = await db()
        .from("customers")
        .select("phone, name")
        .in("phone", numbers);
      for (const one of (friends ?? []) as { phone: string; name: string }[]) {
        named.set(one.phone, (one.name ?? "").split(/\s+/)[0] ?? "");
      }
    }

    return {
      balance,
      moves: rows.map((one) => ({
        amount: Number(one.amount ?? 0),
        reason: one.reason,
        friend: one.friend_phone ? (named.get(one.friend_phone) ?? "A friend") : "",
        at: one.created_at,
      })),
    };
  } catch {
    return { balance: 0, moves: [] };
  }
}
