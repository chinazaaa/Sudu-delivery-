import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "sudu_admin";

function secret(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD must be set. See .env.example.");
  return value;
}

/** The cookie carries a signature of the password, never the password. */
function token(): string {
  return createHmac("sha256", secret()).update("sudu-admin-v1").digest("hex");
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordMatches(attempt: string): boolean {
  return sameString(attempt, secret());
}

export async function signIn(): Promise<void> {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value && sameString(value, token()));
}
