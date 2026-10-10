import webpush from "web-push";
import { db } from "./supabase";

/**
 * Notifications to the shop owner's own phone, through Web Push.
 *
 * Not to be confused with lib/push.ts, which sends Expo notifications to
 * customer phones running the mobile app. That one tells a student their food
 * has been handed over; this one tells whoever runs the shop that an order
 * has landed and needs packing. Different protocol, different table, and the
 * two must never share either: the cost of crossing them is the shop's
 * run-sheet chatter going out to every customer on the list.
 *
 * Everything here is written so that a failure is silent. A notification is
 * never worth failing the checkout, the application or the parcel it is
 * about, and a push service having a bad minute must not take an order with
 * it.
 */

/** Where a notification can send somebody, and what it says on the way. */
export type AdminAlert = {
  title: string;
  body: string;
  /** The admin page that deals with it, as a path: "/admin/orders?view=new". */
  url: string;
};

/** A phone that has asked to be told, as the settings page lists them. */
export type AdminPhone = {
  id: string;
  label: string;
  created_at: string;
  last_sent_at: string | null;
  dead_at: string | null;
  dead_reason: string;
};

/**
 * How much of a notification a lock screen actually shows.
 *
 * iOS gives the title one line and the body two, and anything past that is
 * cut mid-word with no ellipsis, so a title that ran long simply vanished
 * off the end. Trimmed here instead, at a word, so the sentence that arrives
 * is a sentence.
 */
export const TITLE_MOST = 48;
export const BODY_MOST = 110;

/** Cuts at the last whole word that fits, rather than mid-word. */
export function trimToFit(text: string, most: number): string {
  const tidy = text.replace(/\s+/g, " ").trim();
  if (tidy.length <= most) return tidy;
  // One character of the budget goes to the ellipsis, so the result is never
  // longer than asked for.
  const cut = tidy.slice(0, most - 1);
  const space = cut.lastIndexOf(" ");
  // A single word longer than the whole budget has no space to cut at, and
  // half of it still reads better than none of it.
  return (space > most / 2 ? cut.slice(0, space) : cut).trimEnd() + "…";
}

/** Everything that goes out is trimmed on the way, in one place. */
export function forLockScreen(alert: AdminAlert): AdminAlert {
  return {
    title: trimToFit(alert.title, TITLE_MOST),
    body: trimToFit(alert.body, BODY_MOST),
    url: alert.url,
  };
}

/**
 * A subscription that answers 404 or 410 is gone for good.
 *
 * Those two are the push service saying the browser no longer knows this
 * endpoint: the site was removed from the Home Screen, or notifications were
 * switched off. Every other code is a bad minute somewhere and the row stays.
 * Getting this wrong in either direction costs something: delete on a 500 and
 * a working phone goes quiet, keep a 410 and every send from now until
 * somebody notices spends a request failing.
 */
export function isGone(status: number): boolean {
  return status === 404 || status === 410;
}

/** The key a time-based alert records itself under, so it is sent once. */
export function toldKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

/**
 * The VAPID keys, which are what let a push service believe the sender is us.
 *
 * Read on each send rather than at import, because a module read at build
 * time on Vercel is a module that captured the build's environment. Returns
 * false rather than throwing when they are unset: a shop with no keys
 * configured should run exactly as it did before, silently.
 */
function keyed(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  if (!publicKey || !privateKey) return false;
  try {
    // The subject is only ever read by a push service deciding who to
    // complain to, and it has to be a mailto or a URL.
    webpush.setVapidDetails(
      process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store",
      publicKey,
      privateKey
    );
    return true;
  } catch {
    return false;
  }
}

/** Remembers a phone, or updates the one that endpoint already had. */
export async function subscribe(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  label: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const endpoint = input.endpoint.trim();
  if (!endpoint.startsWith("https://")) {
    return { ok: false, error: "That browser did not give a usable subscription." };
  }
  if (!input.p256dh.trim() || !input.auth.trim()) {
    return { ok: false, error: "That browser did not give a usable subscription." };
  }

  try {
    // On the endpoint, not the id: a phone that was forgotten and subscribed
    // again, or one whose permission was reset, comes back with the same
    // endpoint and must keep one row. Two rows means every alert twice.
    const { error } = await db()
      .from("admin_push")
      .upsert(
        {
          endpoint,
          p256dh: input.p256dh.trim(),
          auth: input.auth.trim(),
          label: input.label.trim().slice(0, 60) || "This phone",
          // Whatever killed it last time is over: it has just subscribed.
          dead_at: null,
          dead_reason: "",
        },
        { onConflict: "endpoint" }
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save that. Try again in a moment." };
  }
}

/** Takes a phone off the list, by the id the settings page shows. */
export async function forget(id: string): Promise<boolean> {
  try {
    const { error } = await db().from("admin_push").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/** Every phone on the list, for the settings page. */
export async function adminPhones(): Promise<AdminPhone[]> {
  try {
    const { data } = await db()
      .from("admin_push")
      .select("id, label, created_at, last_sent_at, dead_at, dead_reason")
      .order("created_at", { ascending: true });
    return (data ?? []) as AdminPhone[];
  } catch {
    // The table not being there yet reads the same as nobody having
    // subscribed, which is the honest answer either way.
    return [];
  }
}

type Row = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Buzzes every phone that has asked to be told.
 *
 * Returns how many were reached, and never throws. Callers are checkouts and
 * form handlers that have already written their row, so the one rule is that
 * nothing in here can come back out: a bad endpoint, a push service that is
 * down, a table that is not there yet are all the same thing to an order that
 * has already been saved.
 */
export async function tellAdmin(alert: AdminAlert): Promise<number> {
  try {
    if (!keyed()) return 0;

    const { data, error } = await db()
      .from("admin_push")
      .select("id, endpoint, p256dh, auth")
      .is("dead_at", null);
    if (error) return 0;

    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return 0;

    const payload = JSON.stringify(forLockScreen(alert));

    // Sent in parallel. There are one or two of these, not thousands, and
    // a checkout waiting on three sequential round trips to Apple is a
    // checkout that feels broken.
    const answers = await Promise.all(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payload,
            // A notification about an order that landed is worth nothing in
            // an hour, so it is not kept for one.
            { TTL: 600, urgency: "high" }
          );
          return { id: row.id, ok: true, gone: false, why: "" };
        } catch (cause) {
          const status =
            cause && typeof cause === "object" && "statusCode" in cause
              ? Number((cause as { statusCode: unknown }).statusCode)
              : 0;
          return {
            id: row.id,
            ok: false,
            gone: isGone(status),
            why: status ? `Push service said ${status}.` : "Push service did not answer.",
          };
        }
      })
    );

    const sent = answers.filter((answer) => answer.ok).map((answer) => answer.id);
    const gone = answers.filter((answer) => answer.gone).map((answer) => answer.id);

    // A dead subscription is deleted rather than marked, because it can never
    // come back: the browser threw the keys away. Leaving it would have every
    // send from now on spending a request to be told 410 again.
    if (gone.length > 0) {
      await db().from("admin_push").delete().in("id", gone);
    }
    if (sent.length > 0) {
      await db()
        .from("admin_push")
        .update({ last_sent_at: new Date().toISOString() })
        .in("id", sent);
    }

    return sent.length;
  } catch {
    // Deliberately swallowed. See the note at the top of the file: this is
    // called from inside checkouts.
    return 0;
  }
}

/**
 * What the carts-left-behind alert says.
 *
 * One notification for however many carts are new this run, rather than one
 * each. Five phones buzzing five times in a row at eleven at night is how a
 * shop turns the whole thing off, and the action is the same either way:
 * open the page and message them.
 *
 * Pure, so what it says can be checked without a database or a push service.
 */
export function cartsLeftAlert(
  carts: { name: string; value: number; items: number }[]
): AdminAlert {
  const total = carts.reduce((sum, cart) => sum + cart.value, 0);
  const money = "₦" + Math.round(total).toLocaleString("en-NG");

  if (carts.length === 1) {
    const only = carts[0];
    return {
      title: `${money} left in a cart`,
      body: `${only.name || "Someone"} filled ${only.items} item${
        only.items === 1 ? "" : "s"
      } and never paid.`,
      url: "/admin/carts",
    };
  }

  return {
    title: `${money} left in ${carts.length} carts`,
    body: `${carts.length} people filled a cart and never paid. Each has a WhatsApp button.`,
    url: "/admin/carts",
  };
}

/** What the run-closing-with-money-outstanding alert says. */
export function unpaidRunAlert(run: {
  label: string;
  closes: string;
  orders: number;
  total: number;
}): AdminAlert {
  const money = "₦" + Math.round(run.total).toLocaleString("en-NG");
  return {
    title: `${money} unpaid · closes ${run.closes}`,
    body: `${run.orders} order${run.orders === 1 ? "" : "s"} on the ${
      run.label
    } run still has not been paid for.`,
    // Nothing here marks anything paid. It opens the list so somebody can
    // chase, which is a person's job.
    url: "/admin/orders?view=new",
  };
}

/**
 * Has this already been said?
 *
 * The time-based alerts run every quarter of an hour and look at the same
 * carts and the same runs each time. Without this they would say the same
 * thing ninety-six times a day, which is how somebody turns notifications
 * off and then misses the one that mattered.
 *
 * Erring towards silence on a database error is deliberate: a missed alert is
 * a thing somebody sees in admin anyway, and a repeated one is a phone nobody
 * listens to any more.
 */
export async function alreadyTold(key: string): Promise<boolean> {
  try {
    const { data } = await db()
      .from("admin_alerts_told")
      .select("told")
      .eq("told", key)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return true;
  }
}

/** Writes it down, so the next run in fifteen minutes stays quiet. */
export async function markTold(key: string): Promise<void> {
  try {
    await db().from("admin_alerts_told").upsert({ told: key, at: new Date().toISOString() });
  } catch {
    /* It will be told again in fifteen minutes, which is the lesser harm. */
  }
}

/**
 * Tells the admins once, under a key, and records that it has been.
 *
 * Marked whether or not anybody was reached, for the same reason the
 * abandoned-cart email marks its carts: a shop with no phone subscribed must
 * not accumulate a backlog that all fires the moment one is.
 */
export async function tellAdminOnce(key: string, alert: AdminAlert): Promise<boolean> {
  if (await alreadyTold(key)) return false;
  await tellAdmin(alert);
  await markTold(key);
  return true;
}
