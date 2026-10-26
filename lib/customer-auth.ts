import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";
import { tokenKey } from "./signing";

const COOKIE = "sudu_customer";
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

function sign(phone: string): string {
  // TOKEN_SECRET where it is set, the admin password where it is not. A
  // customer being signed in is not a claim about the shop's board, and
  // the two stopped sharing a key so that changing one never silently
  // signs out everybody holding the other.
  return createHmac("sha256", tokenKey()).update(`customer:${phone}`).digest("hex");
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
 * The number and the order number, for somebody who never kept their PIN.
 *
 * A PIN cannot be sent automatically: there is no way to text one, so
 * every "we will send it to you" is really a person's evening. Somebody
 * who has lost theirs still has the order number on their receipt, and
 * asking for the two together is a question they can actually answer.
 *
 * Weaker than a PIN, and knowingly so. Order numbers run in sequence, so
 * somebody holding a phone number could walk them until one landed. What
 * makes that impractical is the lock the PIN already uses: the same
 * counter, on the same row, so a handful of wrong guesses shuts the
 * number for fifteen minutes whichever way they were guessing. A real
 * customer needs one try and never sees it.
 *
 * Matched against this person's own orders only, by either of the two
 * numbers an order carries: the one printed on it, and the short code in
 * its link.
 */
export async function checkOrderNumber(
  phone: string,
  said: string
): Promise<PinResult> {
  const ref = said.trim().replace(/^#/, "");
  if (ref === "") return { ok: false, error: "That order number is not right." };

  const { data } = await db()
    .from("customers")
    .select("pin_fail_count, pin_locked_until")
    .eq("phone", phone)
    .maybeSingle();

  if (!data) return { ok: false, error: "No orders found for that number." };
  if (data.pin_locked_until && new Date(data.pin_locked_until) > new Date()) {
    return { ok: false, error: "Too many wrong tries. Try again in 15 minutes." };
  }

  // Theirs, and the ones somebody sent them, the same two the orders page
  // shows. A father orders and his son is the one standing at the block.
  const digits = ref.replace(/\D/g, "");
  const or = [
    `short.eq.${ref}`,
    ...(digits !== "" ? [`order_no.eq.${digits}`] : []),
  ].join(",");

  const { data: found } = await db()
    .from("orders")
    .select("id")
    .or(`customer_phone.eq.${phone},deliver_to_phone.eq.${phone}`)
    .or(or)
    .limit(1);

  if (((found ?? []) as unknown[]).length > 0) {
    await db()
      .from("customers")
      .update({ pin_fail_count: 0, pin_locked_until: null })
      .eq("phone", phone);
    return { ok: true };
  }

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

  return {
    ok: false,
    error: "That order number is not on this phone number.",
  };
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

/**
 * The shop taking an order for somebody, from the inside.
 *
 * Somebody orders on WhatsApp and it has to be put on a run. Typing it into
 * a form in admin was a second, poorer shop: half a picker, no sizes, no
 * offers, no "order again", and a second set of bugs to keep in step with
 * the real one. The real one already does all of that, so the shop uses it
 * as them.
 *
 * Only ever set behind the admin password, and signed with the same key as
 * everything else, so it is not a cookie anybody can write for themselves.
 * It carries the number so a stale one cannot follow the shop onto a
 * different customer.
 *
 * It never involves their PIN. A PIN only ever goes to the number it
 * belongs to, and nothing here reads one, shows one or needs one.
 */
const ACTING = "sudu_acting";

export async function actAs(phone: string): Promise<void> {
  (await cookies()).set(ACTING, `${phone}.${sign(`acting:${phone}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Short on purpose. Forgetting to stop is the way this goes wrong, and
    // an afternoon is longer than anybody needs to key in an order.
    maxAge: 60 * 60 * 4,
  });
}

export async function stopActing(): Promise<void> {
  (await cookies()).delete(ACTING);
}

/**
 * Whose order the shop is taking, or null for an ordinary visitor.
 *
 * Checked against the signed-in number as well: the two cookies are set
 * together and a browser holding one without the other is not in the middle
 * of anything.
 */
export async function actingAs(): Promise<string | null> {
  const value = (await cookies()).get(ACTING)?.value;
  if (!value) return null;

  const at = value.lastIndexOf(".");
  if (at < 1) return null;

  const phone = value.slice(0, at);
  if (!sameString(value.slice(at + 1), sign(`acting:${phone}`))) return null;
  return (await currentCustomer()) === phone ? phone : null;
}
