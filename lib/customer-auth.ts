import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

const COOKIE = "sudu_customer";
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

function secret(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD must be set. See .env.example.");
  return value;
}

function sign(phone: string): string {
  return createHmac("sha256", secret()).update(`customer:${phone}`).digest("hex");
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Four digits, generated once on a customer's first order. */
export function newPin(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export type PinResult = { ok: true } | { ok: false; error: string };

/**
 * Checks a phone and PIN. A PIN is only four digits, so five wrong tries lock
 * the number for a quarter of an hour rather than leaving it open to guessing.
 */
export async function checkPin(phone: string, pin: string): Promise<PinResult> {
  const { data } = await db()
    .from("customers")
    .select("pin, pin_fail_count, pin_locked_until")
    .eq("phone", phone)
    .maybeSingle();

  if (!data) return { ok: false, error: "No orders found for that number." };

  if (data.pin_locked_until && new Date(data.pin_locked_until) > new Date()) {
    return { ok: false, error: "Too many wrong tries. Try again in 15 minutes." };
  }

  if (!sameString(String(data.pin), pin.trim())) {
    const failures = (data.pin_fail_count ?? 0) + 1;
    await db()
      .from("customers")
      .update({
        pin_fail_count: failures,
        pin_locked_until:
          failures >= MAX_FAILURES
            ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
            : null,
      })
      .eq("phone", phone);
    return { ok: false, error: "That PIN is not right. Ask us for it on WhatsApp." };
  }

  await db()
    .from("customers")
    .update({ pin_fail_count: 0, pin_locked_until: null })
    .eq("phone", phone);
  return { ok: true };
}

/**
 * The same signed value the cookie carries, as a bearer token for the app.
 *
 * A phone app has no cookie jar worth the name, so it keeps this string and
 * sends it on every request. It is signed with the same secret, so a token
 * cannot be forged and changing the admin password signs every phone out,
 * exactly as it does on the web.
 */
export function tokenFor(phone: string): string {
  return `${phone}.${sign(phone)}`;
}

/** The phone inside a token, or null when it has been tampered with. */
export function phoneFromToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const at = value.lastIndexOf(".");
  if (at < 1) return null;

  const phone = value.slice(0, at);
  return sameString(value.slice(at + 1), sign(phone)) ? phone : null;
}

export async function signInCustomer(phone: string): Promise<void> {
  (await cookies()).set(COOKIE, `${phone}.${sign(phone)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function signOutCustomer(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The phone whose orders this browser may see, if any. */
export async function currentCustomer(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;

  const at = value.lastIndexOf(".");
  if (at < 1) return null;

  const phone = value.slice(0, at);
  return sameString(value.slice(at + 1), sign(phone)) ? phone : null;
}

/** Name and block last used by a number, for filling checkout back in. */
export async function customerDetails(
  phone: string
): Promise<{ name: string; hostel: string; paymentMethod: "transfer" | "card" } | null> {
  // Asked for by name rather than with *, and retried without the newest
  // column, because a database that has not had the migration run on it yet
  // would otherwise fail the whole query and take checkout's fill-in with it.
  const full = await db()
    .from("customers")
    .select("name, hostel, payment_method")
    .eq("phone", phone)
    .maybeSingle();

  const { data } = full.error
    ? await db().from("customers").select("name, hostel").eq("phone", phone).maybeSingle()
    : full;

  if (!data) return null;
  const way = (data as { payment_method?: string }).payment_method;
  return {
    name: data.name as string,
    hostel: (data.hostel as string) ?? "",
    paymentMethod: way === "card" ? "card" : "transfer",
  };
}
