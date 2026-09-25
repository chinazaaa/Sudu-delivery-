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
