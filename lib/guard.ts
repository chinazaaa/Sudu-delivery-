import { db } from "./supabase";

/**
 * Keeping the orders real.
 *
 * Nothing here is a wall. A determined person can get past all of it, and
 * building for that would mean asking every customer to prove they are one,
 * which costs more orders than it saves. What this stops is the cheap
 * version: a script filling the form in a loop, which is what floods a run
 * sheet with "fgxdfg" and buries a real order in an inbox of fake ones.
 */

/**
 * The field nobody can see.
 *
 * A browser shows it to nobody and a person never fills it in. A script
 * reads the form, finds an input and types something in it, which is the
 * whole tell.
 *
 * It is named and labelled like any other optional field, because a script
 * good enough to read the name is good enough to skip anything called a
 * honeypot or labelled "leave this empty". It is not called email either:
 * a browser's own autofill knows that word and would fill it in for a real
 * customer, which would turn this into a way of refusing real orders.
 */
export const TRAP = "collect_ref";

/** Whether the trap was sprung. Anything at all in it is not a person. */
export function sprung(value: FormDataEntryValue | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * How long the form was open before it was sent.
 *
 * Nobody types a name, a number and a block in three seconds, and nobody
 * reads a basket first. A script does the whole thing in one go, which is a
 * tell it cannot hide without deliberately waiting: the field is a plain
 * timestamp and looks like any other piece of form state.
 *
 * Forgiving where it is missing or odd: an old page, a clock that is wrong,
 * a form restored by the browser. It refuses only what is impossibly fast.
 */
export const OPENED = "opened_at";
const TOO_FAST = 3_000;

export function tooFast(value: FormDataEntryValue | null | undefined): boolean {
  const started = Number(typeof value === "string" ? value : 0);
  if (!Number.isFinite(started) || started <= 0) return false;

  const took = Date.now() - started;
  // Negative means their clock is ahead of ours, which is not their fault.
  return took >= 0 && took < TOO_FAST;
}

/**
 * The number printed in our own placeholder.
 *
 * It is on every phone field on the site as an example, and a script filling
 * a form takes the example as the answer. Somebody could in principle own
 * it, so the refusal says what is wrong rather than pretending the order
 * failed: a real person with that number types it again and gets through by
 * saying so to us.
 */
const EXAMPLE = "08031234567";

export function isExampleNumber(phone: string): boolean {
  return phone.replace(/\D/g, "").replace(/^234/, "0") === EXAMPLE;
}

/**
 * How many orders that number has placed in the last few minutes.
 *
 * A person orders lunch once. Somebody adding to an order or ordering for a
 * friend might do it twice in a row, and beyond that it is a loop. Counted
 * from the orders themselves rather than held in memory, because the site
 * runs in more than one place at once and a count in memory would be per
 * place rather than per shop.
 */
export async function ordersLately(phone: string, minutes = 10): Promise<number> {
  if (phone === "") return 0;
  const since = new Date(Date.now() - minutes * 60_000).toISOString();

  const { count, error } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_phone", phone)
    .gte("created_at", since);

  // A count that cannot be read is not a reason to refuse somebody's dinner.
  return error ? 0 : (count ?? 0);
}

/** More than anybody orders in ten minutes, and far less than a loop. */
export const TOO_MANY = 4;
