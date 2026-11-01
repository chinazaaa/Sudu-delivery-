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
export const REFERRAL_REWARD = 1000;

/** How long they have to use it. Long enough not to be a trick, short
 *  enough to be a reason to order. */
export const REWARD_DAYS = 60;

/**
 * What the share message says.
 *
 * Written for the person receiving it, which the first version was not:
 * "use my link and I get a thousand off" is somebody asking a favour, and
 * a favour is a thing you do once for a good friend and never for a
 * stranger. Nothing in it was any use to the person being asked.
 *
 * They do get something. A promoter's link has always carried a welcome
 * off the new customer's first delivery, and a customer's link is the
 * same link, so it carries it too. It simply was not mentioned.
 *
 * So the offer comes first and the asking disappears: what the sender
 * earns is between them and the shop, and putting it in a message to
 * their friend only makes the friend feel used.
 *
 * One line, because it is pasted into a chat rather than read as a page.
 */
export function shareText(code: string, site: string, perk = ""): string {
  const link = `${site}/s/${code.toLowerCase()}`;
  const said = perk.trim();
  return said === ""
    ? `Sudu delivers food to PAU from KFC, Domino's and the rest. My link: ${link}`
    : `Get ${said} on your first Sudu order, food to PAU from KFC, Domino's and the rest: ${link}`;
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

    /*
     * Their name, looked up where the caller has not got one.
     *
     * A code is made out of a name, and a blank one makes "promoter",
     * then "promoter2", then "promoter3": a row of codes that are not
     * anybody's and that nobody would say out loud. The shop already
     * knows what this number is called.
     */
    let called = name.trim();
    if (called === "") {
      const { data: who } = await db()
        .from("customers")
        .select("name")
        .eq("phone", phone)
        .maybeSingle();
      called = String((who as { name?: string } | null)?.name ?? "").trim();
    }

    const { data: all } = await db().from("promoters").select("code");
    const taken = ((all ?? []) as { code: string }[]).map((one) => one.code);
    const code = codeFrom(called, taken);

    await db().from("promoters").insert({
      code,
      handle: code.toLowerCase(),
      name: called || "A friend",
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
  /** Recorded, but nobody has approved it yet, so it is not in the
   *  balance. */
  waiting: boolean;
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
      // Waiting on somebody. Nothing reaches the wallet until it is
      // approved: see approveReferral.
    });
    // Already recorded for this friend, which is the index doing its job.
    return !error;
  } catch {
    return false;
  }
}

/** One referral waiting to be looked at. */
export type WaitingReferral = {
  id: string;
  /** Who earned it, and what the shop calls them. */
  phone: string;
  name: string;
  /** Who they brought in. */
  friendPhone: string;
  friendName: string;
  amount: number;
  orderId: string;
  at: string;
};

/**
 * The referrals nobody has looked at yet.
 *
 * Oldest first: somebody who brought a friend in last week should not be
 * behind somebody who did it this morning.
 */
export async function waitingReferrals(): Promise<WaitingReferral[]> {
  try {
    const { data } = await db()
      .from("credit_moves")
      .select("id, phone, amount, order_id, friend_phone, created_at")
      .eq("reason", "referral")
      .is("approved_at", null)
      .is("rejected_at", null)
      .order("created_at", { ascending: true })
      .limit(100);

    const rows = (data ?? []) as {
      id: string;
      phone: string;
      amount: number;
      order_id: string | null;
      friend_phone: string | null;
      created_at: string;
    }[];
    if (rows.length === 0) return [];

    const numbers = [
      ...new Set(
        rows.flatMap((one) => [one.phone, one.friend_phone ?? ""]).filter(Boolean)
      ),
    ];
    const named = new Map<string, string>();
    const { data: who } = await db()
      .from("customers")
      .select("phone, name")
      .in("phone", numbers);
    for (const one of (who ?? []) as { phone: string; name: string }[]) {
      named.set(one.phone, one.name ?? "");
    }

    return rows.map((one) => ({
      id: one.id,
      phone: one.phone,
      name: named.get(one.phone) ?? "",
      friendPhone: one.friend_phone ?? "",
      friendName: named.get(one.friend_phone ?? "") ?? "",
      amount: Number(one.amount ?? 0),
      orderId: one.order_id ?? "",
      at: one.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Saying yes, which is the moment the money becomes theirs.
 *
 * The balance moves here and nowhere else, so a referral that was never
 * looked at is worth nothing however it was recorded. Idempotent on the
 * approval stamp: pressing it twice pays once, because the second update
 * matches no row.
 */
export async function approveReferral(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const { data } = await db()
      .from("credit_moves")
      .update({ approved_at: new Date().toISOString() })
      .eq("id", id)
      .eq("reason", "referral")
      .is("approved_at", null)
      .is("rejected_at", null)
      .select("phone, amount")
      .maybeSingle();

    const row = data as { phone: string; amount: number } | null;
    if (!row) return false;

    const now = await creditFor(row.phone);
    await db()
      .from("customers")
      .update({ credit: now + Math.max(0, Number(row.amount ?? 0)) })
      .eq("phone", row.phone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saying no, with the reason kept.
 *
 * The row stays rather than being deleted, because the index on the
 * friend's number is what stops the same introduction being claimed
 * twice, and because somebody will ask why.
 */
export async function rejectReferral(id: string, said: string): Promise<boolean> {
  if (!id) return false;
  try {
    const { error } = await db()
      .from("credit_moves")
      .update({
        rejected_at: new Date().toISOString(),
        rejected_said: said.trim().slice(0, 200),
      })
      .eq("id", id)
      .eq("reason", "referral")
      .is("approved_at", null)
      .is("rejected_at", null);
    return !error;
  } catch {
    return false;
  }
}

/**
 * The order it was earned on has gone, so the referral goes with it.
 *
 * Recording on delivery already keeps out the friend who paid and never
 * ate, but a refund can land afterwards: the food was wrong, something
 * was missing, the whole order came back. An introduction that ended in
 * the shop handing the money back is not an introduction the shop pays
 * for.
 *
 * Only ever one still waiting. A referral somebody has approved is money
 * that may already have been spent on another order, and taking that
 * back quietly would leave somebody short at a checkout with no
 * explanation. That one is a conversation, so it is left standing and
 * said plainly on the admin list instead.
 */
export async function withdrawReferralFor(
  orderId: string,
  said: string
): Promise<void> {
  if (!orderId) return;
  try {
    await db()
      .from("credit_moves")
      .update({
        rejected_at: new Date().toISOString(),
        rejected_said: said.trim().slice(0, 200),
      })
      .eq("order_id", orderId)
      .eq("reason", "referral")
      .is("approved_at", null)
      .is("rejected_at", null);
  } catch {
    /* It stays on the waiting list, where somebody will see the order
       it points at and say no by hand. */
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
        .select("amount, reason, friend_phone, created_at, approved_at, rejected_at")
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const rows = ((data ?? []) as {
      amount: number;
      reason: string;
      friend_phone: string | null;
      created_at: string;
      approved_at: string | null;
      rejected_at: string | null;
    }[])
      // A referral somebody said no to is not on their page. Telling
      // them a friend counted and then taking it off the list again is
      // worse than never having shown it.
      .filter((one) => one.rejected_at === null);

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
        /* Recorded but not theirs yet. Shown, because a friend who has
           ordered is the news; said as waiting, because a balance that
           does not match the list is the thing that gets messaged
           about. */
        waiting: one.approved_at === null,
      })),
    };
  } catch {
    return { balance: 0, moves: [] };
  }
}

/**
 * Food has arrived, so whoever sent them has earned something.
 *
 * Delivered rather than paid. Paying is a promise and delivering is the
 * thing itself, and the gap between them is where the cheap version of
 * this gets gamed: order, pay, claim the friend, cancel. An order that
 * was handed over actually happened.
 *
 * Only on their first. The friend who brought them in is credited for
 * bringing them in, once; every meal after that is the shop's own doing.
 *
 * Nothing reaches a wallet here. It is recorded and waits for somebody to
 * look at it, because two people on one phone, or a name nobody
 * recognises, is easier to catch by eye than to write a rule for.
 */
export async function noteReferrals(orderIds: string[]): Promise<void> {
  const ids = [...new Set(orderIds.filter(Boolean))];
  if (ids.length === 0) return;

  for (const orderId of ids) {
    try {
      const { data } = await db()
        .from("orders")
        .select("customer_phone, status")
        .eq("id", orderId)
        .maybeSingle();
      const order = data as { customer_phone: string; status: string } | null;
      if (!order?.customer_phone || order.status !== "delivered") continue;

      // Their first delivered order, counted off the orders rather than
      // remembered: a column that has to be kept in step is one that drifts.
      const { count } = await db()
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_phone", order.customer_phone)
        .eq("status", "delivered");
      if ((count ?? 0) !== 1) continue;

      const { data: who } = await db()
        .from("customers")
        .select("promoter_code")
        .eq("phone", order.customer_phone)
        .maybeSingle();
      const code = String(
        (who as { promoter_code?: string } | null)?.promoter_code ?? ""
      ).trim();
      if (code === "") continue;

      // Only a customer's own code earns a wallet. A recruited promoter
      // is paid cash per order as they always have been, and paying both
      // would be paying twice for one friend.
      const { data: sender } = await db()
        .from("promoters")
        .select("phone, is_customer")
        .eq("code", code)
        .maybeSingle();
      const sent = sender as { phone?: string; is_customer?: boolean } | null;
      if (!sent?.is_customer || !sent.phone) continue;

      await rewardReferrer({
        referrer: sent.phone,
        friend: order.customer_phone,
        orderId,
      });
    } catch {
      /* A referral nobody recorded is one somebody can add by hand. An
         order that would not mark delivered is a worse problem. */
    }
  }
}

/**
 * What a new customer gets for using somebody's link, in words.
 *
 * Read off the coupon the shop has actually set rather than written into
 * the message, so changing the welcome in admin changes what every
 * customer's link promises. Empty where there is no welcome on, which
 * leaves the share message offering nothing rather than offering a
 * number nobody will honour.
 */
export async function welcomeSaid(): Promise<string> {
  try {
    const { safeSettings } = await import("./settings");
    const code = (await safeSettings()).promoter_perk_code.trim();
    if (code === "") return "";

    const { data } = await db()
      .from("coupons")
      .select("amount, applies_to, active")
      .eq("code", code)
      .maybeSingle();
    const perk = data as
      | { amount: number; applies_to: string; active: boolean }
      | null;
    if (!perk?.active) return "";

    const amount = Math.max(0, Number(perk.amount ?? 0));
    if (amount <= 0) return "";
    /*
     * Said without a "your" in it, because it is read in two sentences
     * facing opposite ways: the message tells the friend what they get,
     * and the card tells the sender what their link gives somebody else.
     * One phrase carrying "your" was right in the message and wrong on
     * the card, which read "gives them ₦500 off your delivery".
     */
    const naira = `₦${amount.toLocaleString()}`;
    return perk.applies_to === "order" ? `${naira} off food` : `${naira} off delivery`;
  } catch {
    return "";
  }
}

/** A customer who has a link of their own, and how it is doing. */
export type Referrer = {
  code: string;
  name: string;
  phone: string;
  /** Approved and paid into their wallet. */
  brought: number;
  earned: number;
  /** Recorded and waiting on somebody. */
  waiting: number;
  /** What is left in the wallet, unspent. */
  balance: number;
};

/**
 * Everybody who has brought somebody in, best first.
 *
 * The promoter page is for people the shop recruited: a rate, bank
 * details, a payout ledger, a PIN for a dashboard. A customer has none of
 * that and never will, so listing them together was twenty rows of empty
 * columns between the few people who are actually owed money.
 *
 * What a customer referral is actually about is this: who brought whom
 * in, what was approved, and what is still sitting in a wallet. Anybody
 * who has brought nobody in is left out: a code exists for every
 * customer in the shop and a list of them is a list of customers, which
 * is a page that already exists.
 */
export async function referrers(): Promise<Referrer[]> {
  try {
    const { data: rows } = await db()
      .from("credit_moves")
      .select("phone, amount, approved_at, rejected_at")
      .eq("reason", "referral")
      .is("rejected_at", null)
      .limit(1000);

    const moves = (rows ?? []) as {
      phone: string;
      amount: number;
      approved_at: string | null;
    }[];
    if (moves.length === 0) return [];

    const byPhone = new Map<string, { brought: number; earned: number; waiting: number }>();
    for (const one of moves) {
      const got = byPhone.get(one.phone) ?? { brought: 0, earned: 0, waiting: 0 };
      if (one.approved_at) {
        got.brought += 1;
        got.earned += Math.max(0, Number(one.amount ?? 0));
      } else {
        got.waiting += 1;
      }
      byPhone.set(one.phone, got);
    }

    const numbers = [...byPhone.keys()];
    const [{ data: who }, { data: codes }] = await Promise.all([
      db().from("customers").select("phone, name, credit").in("phone", numbers),
      db().from("promoters").select("phone, code").in("phone", numbers),
    ]);

    const named = new Map(
      ((who ?? []) as { phone: string; name: string; credit: number }[]).map((one) => [
        one.phone,
        one,
      ])
    );
    const coded = new Map(
      ((codes ?? []) as { phone: string; code: string }[]).map((one) => [
        one.phone,
        one.code,
      ])
    );

    return numbers
      .map((phone) => {
        const sums = byPhone.get(phone)!;
        const person = named.get(phone);
        return {
          code: coded.get(phone) ?? "",
          name: person?.name ?? "",
          phone,
          brought: sums.brought,
          earned: sums.earned,
          waiting: sums.waiting,
          balance: Math.max(0, Number(person?.credit ?? 0)),
        };
      })
      .sort((a, b) => b.brought - a.brought || b.waiting - a.waiting);
  } catch {
    return [];
  }
}
