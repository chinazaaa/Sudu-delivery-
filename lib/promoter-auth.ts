import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

const COOKIE = "sudu_promoter";

function secret(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD must be set. See .env.example.");
  return value;
}

function sign(code: string): string {
  return createHmac("sha256", secret()).update(`promoter:${code}`).digest("hex");
}

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A promoter's own sign-in: their code and the PIN the admin gives them. It is
 * the same shape as a customer's, because it is the same kind of thing: a way
 * back into your own numbers, with nothing to reset and no account to keep.
 */
export async function checkPromoterPin(
  code: string,
  pin: string
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return { ok: false, error: "Enter your code." };

  const { data } = await db()
    .from("promoters")
    .select("code, pin, active")
    .eq("code", wanted)
    .maybeSingle();

  if (!data || !data.active) return { ok: false, error: "That code is not in use." };
  if (!data.pin || !same(String(data.pin), pin.trim())) {
    return { ok: false, error: "That PIN is wrong. Ask us to send it again." };
  }
  return { ok: true, code: data.code as string };
}

export async function signInPromoter(code: string): Promise<void> {
  (await cookies()).set(COOKIE, `${code}.${sign(code)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 120,
    path: "/",
  });
}

export async function signOutPromoter(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The promoter looking at the page, if the cookie is one we signed. */
export async function currentPromoter(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;

  const [code, signature] = raw.split(".");
  if (!code || !signature) return null;
  return same(sign(code), signature) ? code : null;
}
