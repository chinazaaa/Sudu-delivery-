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

/** The PIN on a number, for showing someone their own the moment they order. */
export async function pinFor(phone: string): Promise<string | null> {
  const { data } = await db()
    .from("customers")
    .select("pin")
    .eq("phone", phone)
    .maybeSingle();
  return (data?.pin as string | undefined) ?? null;
}
