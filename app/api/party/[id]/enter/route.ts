import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { joinableGroup } from "@/lib/groups";
import { holdsOwnSeat, seatFrom } from "@/lib/seat";
import { takeSeat } from "@/lib/group-carts";

export const dynamic = "force-dynamic";

const A_DAY = 60 * 60 * 24;

/**
 * Take a seat in a shared delivery, by name.
 *
 * Joining and ordering used to be the same moment, which meant a phone number
 * and a block were asked for before anybody had chosen so much as a drink.
 * They are two moments. This is the first: who you are, and that you are in.
 * The food comes next and the delivery details after that, while everybody
 * waits for the last person.
 *
 * The seat is held by a token this browser keeps, not by a number nobody has
 * given yet. It is a cookie, so it goes with every request on its own and
 * survives whatever the browser does or does not manage to remember.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const id = (await params).id;

  // Checked before anything is kept, so a closed or vanished link cannot
  // quietly attach somebody to a group that has already been priced.
  const group = await joinableGroup(id);
  if (!group) return NextResponse.json({ ok: false }, { status: 404 });

  const body = await request.json().catch(() => ({}) as { name?: string });
  const name = String((body as { name?: string }).name ?? "").trim().slice(0, 40);

  // The app keeps its own seat and sends it; a browser is given one to keep.
  const own = holdsOwnSeat(request);
  const token = (await seatFrom(request)) || randomUUID();

  if (!own) {
    const jar = await cookies();
    const keep = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: A_DAY,
    };
    jar.set("sudu_group", group.id, keep);
    jar.set("sudu_seat", token, keep);
  }

  // A name is what the others see, so the seat is only written once there is
  // one. Somebody arriving on the link before they have said who they are is
  // in the group as far as the cookies go, and appears to everybody else the
  // moment they say.
  // The seat goes back to the app, which has nowhere else to learn it, and
  // the group's real id with it: the caller may have arrived on a short code.
  if (name.length < 2) {
    return NextResponse.json({ ok: true, named: false, seat: token, groupId: group.id });
  }

  const seat = await takeSeat({ groupId: group.id, token, name });
  if (!seat) {
    // Almost always a database that has not had the migration run on it yet.
    // Saying so beats answering 200 to something that did not happen.
    return NextResponse.json(
      { ok: false, named: false, error: "Could not take a seat in that group." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, named: true, seat: token, groupId: group.id });
}
