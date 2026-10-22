import { db } from "./supabase";

/**
 * A pause between wrong admin passwords.
 *
 * A customer's four digit PIN already gets five tries and then a quarter of
 * an hour's rest. The admin password, which opens the whole shop, got
 * nothing at all: it could be guessed as fast as a machine could ask.
 *
 * The rule itself is a pure function so it can be read and tested without a
 * database, which matters more here than almost anywhere else: this is the
 * code that decides whether the owner can get into her own board.
 */

/** Wrong tries allowed before the next one has to wait. */
export const FREE_TRIES = 5;

/**
 * How long the next try must wait, given how many have been wrong in a row.
 *
 * A pause, not a lockout, and that is the whole design. There is one admin.
 * Somebody hammering the login must not be able to shut the shop's owner
 * out of her own board on a Saturday evening with a car on the road, so
 * the number a person can actually hit is small: five wrong tries, which is
 * already more than anybody mistypes, costs sixty seconds.
 *
 * Sixty seconds is nothing to a person and ruinous to a machine. It caps
 * guessing at five a minute where it was limited only by how fast requests
 * could be sent, which is the difference between a password being guessable
 * and not.
 *
 * It grows once, after twenty. Nobody mistypes twenty times in a row, so by
 * then it is not a person, and five minutes a go makes a sustained attack
 * pointless while still being survivable if it somehow was.
 */
export function pauseAfter(fails: number): number {
  if (fails < FREE_TRIES) return 0;
  if (fails < 20) return 60;
  return 300;
}

/** Whole seconds left on a pause, or 0 when there is none. */
export function waitLeft(
  lockedUntil: string | null | undefined,
  now: number = Date.now()
): number {
  if (!lockedUntil) return 0;
  const until = new Date(lockedUntil).getTime();
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** How the wait is said to somebody who has just been told to wait. */
export function waitSaid(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `Wait ${seconds} second${seconds === 1 ? "" : "s"} and try again.`;
  const minutes = Math.ceil(seconds / 60);
  return `Wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}

type Gate = { fails: number; locked_until: string | null };

/**
 * Whether the login may be tried at all, and what to say if not.
 *
 * Fails open on purpose. If the table is missing, or the database is
 * unreachable, this returns no wait rather than refusing everybody: a
 * throttle that can lock the owner out of her own shop because a query
 * timed out is worse than the guessing it was built to stop.
 */
export async function waitBeforeTrying(): Promise<number> {
  try {
    const { data } = await db()
      .from("admin_gate")
      .select("fails, locked_until")
      .eq("id", true)
      .maybeSingle();

    return waitLeft((data as Gate | null)?.locked_until ?? null);
  } catch {
    return 0;
  }
}

/**
 * One wrong password, written down.
 *
 * The pause is set from the new count, so the fifth wrong try is the one
 * that starts the wait. Tries made during a pause are refused before they
 * reach the password at all and are not counted: the point is to slow
 * guessing down, and counting refusals would let somebody lengthen the
 * owner's wait simply by hammering the door.
 */
export async function noteWrongPassword(): Promise<number> {
  try {
    const { data } = await db()
      .from("admin_gate")
      .select("fails")
      .eq("id", true)
      .maybeSingle();

    const fails = Number((data as { fails?: number } | null)?.fails ?? 0) + 1;
    const pause = pauseAfter(fails);

    await db()
      .from("admin_gate")
      .upsert(
        {
          id: true,
          fails,
          locked_until:
            pause > 0 ? new Date(Date.now() + pause * 1000).toISOString() : null,
        },
        { onConflict: "id" }
      );

    return pause;
  } catch {
    return 0;
  }
}

/** The right password clears everything. Getting in is proof of being the one. */
export async function clearWrongPasswords(): Promise<void> {
  try {
    await db()
      .from("admin_gate")
      .upsert({ id: true, fails: 0, locked_until: null }, { onConflict: "id" });
  } catch {
    /* Signed in either way. A counter that would not reset is not worth
       refusing somebody who has just proved who they are. */
  }
}
