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

/** Sends to a list of tokens. Expo takes a hundred at a time. */
export async function pushTo(tokens: string[], message: PushMessage): Promise<number> {
  const valid = tokens.filter((token) => token.startsWith("ExponentPushToken"));
  if (valid.length === 0) return 0;

  let sent = 0;
  for (let at = 0; at < valid.length; at += 100) {
    const batch = valid.slice(at, at + 100).map((to) => ({
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
      if (response.ok) sent += batch.length;
    } catch {
      /* A provider having a bad minute is not this order's problem. */
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
