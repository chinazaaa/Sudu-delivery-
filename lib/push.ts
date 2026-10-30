import { db } from "./supabase";

/**
 * Notifications to the app, through Expo.
 *
 * Expo keeps the Apple and Google plumbing on its side, so this is one POST
 * with a list of tokens. Nothing here is awaited by anything that matters: a
 * notification that fails to send must never fail an order.
 */
const ENDPOINT = "https://exp.host/--/api/v2/push/send";

export type PushMessage = {
  title: string;
  body: string;
  /** Where tapping it should land, as a path: "/o/abc". */
  path?: string;
};

/** Every device a number has the app installed on. */
async function tokensFor(phone: string): Promise<string[]> {
  try {
    const { data } = await db().from("push_devices").select("token").eq("phone", phone);
    return ((data ?? []) as { token: string }[]).map((row) => row.token);
  } catch {
    return [];
  }
}

/** What Expo says about each message, one ticket per token, in order. */
type Ticket = {
  status?: string;
  details?: { error?: string };
};

/**
 * Sends to a list of tokens. Expo takes a hundred at a time.
 *
 * The count is what actually went, not what was posted. Expo answers 200 to
 * a batch and then says per token whether it worked, so counting the batch
 * meant a hundred failures read as a hundred sends: a deal that reached
 * nobody looked exactly like one that reached everybody.
 *
 * A phone that has deleted the app comes back as DeviceNotRegistered, and
 * that token is dropped. Apple and Google both stop accepting it, so keeping
 * it only inflates the number on the admin page and slows every send after.
 */
export async function pushTo(tokens: string[], message: PushMessage): Promise<number> {
  const valid = tokens.filter((token) => token.startsWith("ExponentPushToken"));
  if (valid.length === 0) return 0;

  let sent = 0;
  const gone: string[] = [];

  for (let at = 0; at < valid.length; at += 100) {
    const slice = valid.slice(at, at + 100);
    const batch = slice.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      sound: "default",
      data: message.path ? { path: message.path } : {},
    }));

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (!response.ok) continue;

      const body = (await response.json()) as { data?: Ticket[] };
      const tickets = body.data;
      // An answer we cannot read is taken at its word rather than counted as
      // a failure: the message did leave, and guessing the other way would
      // have an admin resending something everybody already has.
      if (!Array.isArray(tickets)) {
        sent += slice.length;
        continue;
      }

      tickets.forEach((ticket, index) => {
        if (ticket?.status === "ok") {
          sent += 1;
          return;
        }
        if (ticket?.details?.error === "DeviceNotRegistered") gone.push(slice[index]);
      });
    } catch {
      /* A provider having a bad minute is not this order's problem. */
    }
  }

  if (gone.length > 0) {
    try {
      await db().from("push_devices").delete().in("token", gone);
    } catch {
      /* They will come back as gone next time, and go then. */
    }
  }

  return sent;
}

/** One customer, on whichever phones they have the app on. */
export async function pushToPhone(phone: string, message: PushMessage): Promise<number> {
  return pushTo(await tokensFor(phone), message);
}

/**
 * Everybody who has the app and has not switched deals off.
 *
 * Kept separate from `pushToPhone` on purpose: that one tells a person about
 * their own order, which they asked for by ordering. This one is us starting
 * the conversation, and it only ever goes to phones that have left the switch
 * on. A campaign that ignored the switch would be the last one they read.
 */
export async function pushDeal(message: PushMessage): Promise<{ sent: number; of: number }> {
  try {
    const { data } = await db().from("push_devices").select("token").eq("deals", true);
    const tokens = ((data ?? []) as { token: string }[]).map((row) => row.token);
    return { sent: await pushTo(tokens, message), of: tokens.length };
  } catch {
    return { sent: 0, of: 0 };
  }
}

/**
 * The same thing, to a few people rather than to everybody.
 *
 * Not every notification is for the whole shop. A deal at one counter is
 * for the people who buy from it, a word about a box is for whoever asked
 * about boxes, and sending both to all seven phones is how a switch gets
 * turned off. The numbers are picked in admin off a list of who has the
 * app, so nothing here has to guess who they are.
 *
 * The deals switch still decides. Somebody who has turned it off is not
 * someone an admin can put back by ticking their name: the switch is
 * theirs, and an order of their own is the only thing that still reaches
 * them.
 */
export async function pushDealTo(
  phones: string[],
  message: PushMessage
): Promise<{ sent: number; of: number }> {
  const wanted = [...new Set(phones.map((one) => one.trim()).filter(Boolean))];
  if (wanted.length === 0) return { sent: 0, of: 0 };
  try {
    const { data } = await db()
      .from("push_devices")
      .select("token")
      .eq("deals", true)
      .in("phone", wanted);
    const tokens = ((data ?? []) as { token: string }[]).map((row) => row.token);
    return { sent: await pushTo(tokens, message), of: tokens.length };
  } catch {
    return { sent: 0, of: 0 };
  }
}

/** Somebody with the app, as the list to pick from shows them. */
export type DealPerson = {
  phone: string;
  /** What the shop calls them. Empty where nobody has written it down,
   *  and then the number is the name. */
  name: string;
  /** How many orders they have placed, so a list of numbers reads as
   *  people: the regular and the one who tried us once are not the same
   *  person to write to. */
  orders: number;
  /** The day of their last one, as "2026-10-30". Empty where there is
   *  none. */
  lastOrder: string;
};

/**
 * Everybody who could be picked, newest customer first.
 *
 * Only phones with the app and the deals switch on, because they are the
 * only ones a notification can reach at all: a list offering names that
 * cannot be written to is a list that lies about what ticking them does.
 */
export async function dealPeople(): Promise<DealPerson[]> {
  try {
    const { data } = await db()
      .from("push_devices")
      .select("phone")
      .eq("deals", true);
    const phones = [
      ...new Set(
        ((data ?? []) as { phone: string }[])
          .map((row) => (row.phone ?? "").trim())
          .filter(Boolean)
      ),
    ];
    if (phones.length === 0) return [];

    const [people, orders] = await Promise.all([
      db().from("customers").select("phone, name").in("phone", phones),
      db()
        .from("orders")
        .select("customer_phone, created_at")
        .in("customer_phone", phones)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    const named = new Map(
      ((people.data ?? []) as { phone: string; name: string }[]).map((row) => [
        row.phone,
        (row.name ?? "").trim(),
      ])
    );
    const count = new Map<string, number>();
    const last = new Map<string, string>();
    for (const row of (orders.data ?? []) as {
      customer_phone: string;
      created_at: string;
    }[]) {
      const who = row.customer_phone;
      if (!who) continue;
      count.set(who, (count.get(who) ?? 0) + 1);
      // The rows come newest first, so the first one seen is the last one
      // placed.
      if (!last.has(who)) last.set(who, (row.created_at ?? "").slice(0, 10));
    }

    return phones
      .map((phone) => ({
        phone,
        name: named.get(phone) ?? "",
        orders: count.get(phone) ?? 0,
        lastOrder: last.get(phone) ?? "",
      }))
      .sort(
        (a, b) =>
          b.lastOrder.localeCompare(a.lastOrder) ||
          (a.name || a.phone).localeCompare(b.name || b.phone)
      );
  } catch {
    return [];
  }
}

/** How many phones a deal would reach, for showing before one is sent. */
export async function dealAudience(): Promise<number> {
  try {
    const { count } = await db()
      .from("push_devices")
      .select("token", { count: "exact", head: true })
      .eq("deals", true);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Tell people their food has been handed over.
 *
 * There are three ways an order becomes delivered: a bag ticked off, one
 * order marked, or a whole run handed out. All three used to end in silence.
 * "We are at your hostel" went out and then nothing, which is fine for the
 * person standing there taking the bag and no use at all to whoever bought
 * it from London, or sent it as a gift, and is waiting to hear that it
 * landed.
 *
 * It goes to whoever placed the order, always, wherever they are. That is
 * the one rule worth having: an order can be placed by a student and paid
 * by a parent on a link, or bought for somebody else entirely, and in every
 * one of those the person who wants to know it arrived is the person who
 * asked for it.
 *
 * It reads the orders itself rather than being handed phone numbers, so it
 * can skip anything already delivered: ticking a bag off and then handing
 * the run out must not buzz the same phone twice.
 */
export async function tellDelivered(orderIds: string[]): Promise<number> {
  const ids = [...new Set(orderIds.filter(Boolean))];
  if (ids.length === 0) return 0;

  try {
    const { data, error } = await db()
      .from("orders")
      .select("id, status, customer_phone")
      .in("id", ids);
    if (error) return 0;

    const rows = (data ?? []) as { status: string; customer_phone: string }[];

    let sent = 0;
    for (const row of rows) {
      if (row.status !== "delivered" || !row.customer_phone) continue;
      sent += await pushToPhone(row.customer_phone, {
        title: "Delivered",
        body: "Your order has been handed over. Thank you for ordering with Sudu.",
      });
    }
    return sent;
  } catch {
    // A notification is never worth failing the thing it is about.
    return 0;
  }
}
