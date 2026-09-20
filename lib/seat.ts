import { cookies } from "next/headers";

/** The header the app sends, since it has no cookie jar. */
const HEADER = "x-sudu-seat";

/**
 * Whose seat this request is.
 *
 * A seat is held by a token the caller keeps, not by a phone number nobody
 * has given yet. On the website that token is an httpOnly cookie; the app has
 * no cookies, so it makes one, keeps it, and sends it on every call. Both are
 * the same thing to everything downstream.
 *
 * The seat is the only thing that says who somebody is. Never the group id:
 * every member holds that, so anything trusting it lets any member act as the
 * leader.
 */
export async function seatFrom(request: Request): Promise<string> {
  const given = (request.headers.get(HEADER) ?? "").trim();
  if (given) return given.slice(0, 64);
  return (await cookies()).get("sudu_seat")?.value ?? "";
}

/** Whether this is the app, which keeps its own seat and wants no cookies. */
export function holdsOwnSeat(request: Request): boolean {
  return (request.headers.get(HEADER) ?? "").trim() !== "";
}
