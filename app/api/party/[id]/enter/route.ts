import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { joinableGroup } from "@/lib/groups";

export const dynamic = "force-dynamic";

/** A day is longer than any group lives, and a closed group is refused on the
 *  way in anyway, so this only ever has to outlast the quarter of an hour. */
const A_DAY = 60 * 60 * 24;

/**
 * Remember, on the server, which group this browser is in.
 *
 * The group used to live only in localStorage, read by the checkout page and
 * posted back in a hidden field. Anything at all that lost it, a cleared
 * store, a different tab, a private window, an effect that had not run yet,
 * meant the order went out alone at the full fee, and nothing on either side
 * could tell that was not what the customer wanted.
 *
 * A cookie goes with the checkout POST on its own, so the server can read the
 * group whether or not the browser managed to say it.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const id = (await params).id;

  // Checked before it is kept, so a stale or closed link cannot quietly
  // attach somebody's next order to a group that has already been priced.
  const group = await joinableGroup(id);
  if (!group) return NextResponse.json({ ok: false }, { status: 404 });

  (await cookies()).set("sudu_group", group.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: A_DAY,
  });

  return NextResponse.json({ ok: true });
}
