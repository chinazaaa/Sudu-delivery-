import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentCustomer } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { runDateLabel } from "@/lib/time";
import {
  LEAST_MEMBERS,
  MOST_WISHES,
  matchFor,
  memberIn,
  membersOf,
  roomByToken,
  wishesOf,
  type Wish,
} from "@/lib/santa";
import {
  addWishAction,
  closeRoomAction,
  handoverAction,
  pickWishAction,
  removeWishAction,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A Secret Santa room",
  description: "Join the draw, add your wishlist, and see who you are buying for.",
  robots: { index: false, follow: false },
};

/**
 * One room, at whatever stage it is at.
 *
 * Four pages in one, because they are the same page at four moments and
 * splitting them would mean somebody landing on the wrong one from a link
 * they were sent a fortnight ago: before you have joined, while the room
 * fills up, after the draw, and once it is all delivered.
 *
 * Nothing on this page ever says who drew whom. The only name a member
 * sees is the one they are buying for, and it comes from matchFor, which
 * takes the giver and returns the receiver and has no other shape.
 */
export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ problem?: string; joined?: string }>;
}) {
  const { token } = await params;
  const { problem, joined } = await searchParams;

  const room = await roomByToken(token);
  if (!room) notFound();

  const settings = await safeSettings();

  const phone = await currentCustomer();
  const me = phone ? await memberIn(room.id, phone) : null;
  const people = await membersOf(room.id);
  const mine = me ? await wishesOf(me.id) : [];
  const match = me && room.status !== "open" ? await matchFor(room.id, me.phone) : null;

  const lists = await Promise.all(
    people.map(async (one) => ({ id: one.id, has: (await wishesOf(one.id)).length > 0 }))
  );
  const written = new Set(lists.filter((one) => one.has).map((one) => one.id));

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <p className="text-sm font-semibold text-muted">Secret Santa</p>
      <h1 className="section-title">{room.name}</h1>
      <p className="mt-1 text-muted">
        {naira(room.budget)} each · exchanged {runDateLabel(room.exchangeDate)}
      </p>

      {problem ? (
        <p className="card mt-4 border-brand/30 bg-brand/5 font-semibold text-brand">
          {problem}
        </p>
      ) : null}
      {joined ? (
        <p className="card mt-4 border-mint/40 bg-mint/10 font-semibold">
          You are in. Add what you would like below.
        </p>
      ) : null}

      {/* Before you are in it.
        *
        * No form writes a member row. Somebody is in the draw when their
        * money has arrived and not a moment sooner, and nothing typed into
        * a public box proves that. So this hands them to WhatsApp, we take
        * the payment, and the member is written in admin. The rule the
        * whole thing rests on stays true of the data rather than of
        * somebody remembering to check a column.
        */}
      {!me ? (
        <div className="card mt-6 space-y-3">
          <h2 className="font-bold">Join this room</h2>
          <p className="text-sm text-muted">
            Joining costs {naira(room.budget)}, paid up front. That is what buys
            the gift you are giving, and whatever it does not use comes back to
            you the same week. Nobody who has not paid is in the draw, so nobody
            gives a gift and goes home without one.
          </p>

          {room.status !== "open" ? (
            <p className="font-semibold text-brand">
              Joining has closed for this room.
            </p>
          ) : (
            <>
              <a
                className="btn-primary w-full"
                href={
                  whatsappLink(
                    settings.whatsapp_number,
                    `Hi Sudu, I'd like to join the ${room.name} Secret Santa (${naira(room.budget)}).`
                  ) ?? "/support"
                }
              >
                Join for {naira(room.budget)}
              </a>
              <p className="text-sm text-muted">
                This opens a chat. We take the payment there and put you in the
                room, and you will get a PIN on that number for signing in.
              </p>
            </>
          )}
        </div>
      ) : null}

      {/* Who is here. */}
      <section className="card mt-6">
        <h2 className="font-bold">
          {people.length} {people.length === 1 ? "person" : "people"} in
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {people.map((one) => (
            <li key={one.id} className="flex items-center justify-between gap-3">
              <span>{one.name}</span>
              <span className="text-muted">
                {written.has(one.id) ? "list ready" : "no list yet"}
              </span>
            </li>
          ))}
        </ul>
        {room.status === "open" ? (
          <p className="mt-3 text-sm text-muted">
            Joining closes {runDateLabel(room.closeDate)}.{" "}
            {people.length < LEAST_MEMBERS
              ? `${LEAST_MEMBERS - people.length} more needed to draw.`
              : "Enough to draw."}
          </p>
        ) : null}

        {me && phone === room.creatorPhone && room.status === "open" ? (
          <form action={closeRoomAction} className="mt-4">
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-quiet w-full">
              Close the room and draw names
            </button>
            <p className="mt-1.5 text-sm text-muted">
              This cannot be undone, and nobody can join or change their list
              afterwards.
            </p>
          </form>
        ) : null}
      </section>

      {/* Your own list, while there is still time to write it. */}
      {me && room.status === "open" ? (
        <section className="card mt-6">
          <h2 className="font-bold">What you would like</h2>
          <p className="mt-1 text-sm text-muted">
            Three to five things. Whoever drew you picks one, so give them a
            choice, and give us something to fall back on if the first is
            nowhere in Lagos.
          </p>

          <ul className="mt-3 space-y-2">
            {mine.map((one: Wish) => (
              <li key={one.id} className="flex items-start justify-between gap-3 border-t pt-2">
                <div>
                  <p className="font-semibold">{one.title}</p>
                  {one.note ? <p className="text-sm text-muted">{one.note}</p> : null}
                  {one.estPrice > 0 ? (
                    <p className="text-sm text-muted">about {naira(one.estPrice)}</p>
                  ) : null}
                </div>
                <form action={removeWishAction}>
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="wishId" value={one.id} />
                  <button type="submit" className="text-sm font-semibold text-brand">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {mine.length < MOST_WISHES ? (
            <form action={addWishAction} className="mt-4 space-y-3 border-t pt-4">
              <input type="hidden" name="token" value={token} />
              <div>
                <label className="label" htmlFor="title">
                  What is it?
                </label>
                <input
                  id="title"
                  name="title"
                  className="field"
                  placeholder="Maison Margiela perfume"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="note">
                  A link, or how to know it is the right one
                </label>
                <input
                  id="note"
                  name="note"
                  className="field"
                  placeholder="Replica, Jazz Club. 30ml is fine"
                />
              </div>
              <div>
                <label className="label" htmlFor="estPrice">
                  What you think it costs
                </label>
                <input
                  id="estPrice"
                  name="estPrice"
                  className="field"
                  type="number"
                  min={0}
                  step={500}
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Add to my list
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">
              That is {MOST_WISHES}, which is plenty. Remove one to add another.
            </p>
          )}
        </section>
      ) : null}

      {/* After the draw. */}
      {match ? (
        <section className="card mt-6">
          <h2 className="font-bold">You are buying for {match.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Pick one thing. We will find it, and if it comes to more than{" "}
            {naira(match.budget)} we will ask you before buying anything.
          </p>

          {match.wishes.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {match.name} never wrote a list. Message us and we will find
              something good within the budget.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {match.wishes.map((one) => (
                <li key={one.id} className="flex items-start justify-between gap-3 border-t pt-2">
                  <div>
                    <p className="font-semibold">{one.title}</p>
                    {one.note ? <p className="text-sm text-muted">{one.note}</p> : null}
                    {one.estPrice > 0 ? (
                      <p className="text-sm text-muted">about {naira(one.estPrice)}</p>
                    ) : null}
                  </div>
                  {match.pickedWishId === one.id ? (
                    <span className="text-sm font-bold text-mint">Picked</span>
                  ) : (
                    <form action={pickWishAction}>
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="wishId" value={one.id} />
                      <button type="submit" className="text-sm font-semibold text-brand">
                        Pick this
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {match.pickedWishId ? (
            <form action={handoverAction} className="mt-5 space-y-3 border-t pt-4">
              <input type="hidden" name="token" value={token} />
              <h3 className="font-bold">Who hands it over?</h3>
              <p className="text-sm text-muted">
                We can bring it with the rest of the gifts on the exchange day,
                or deliver it to you first so you can give it to them yourself.
              </p>

              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="byGiver" value="0" defaultChecked className="mt-1" />
                <span>
                  <span className="font-semibold">We deliver it</span> on{" "}
                  {runDateLabel(match.exchangeDate)}, with everybody else's.
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="byGiver" value="1" className="mt-1" />
                <span>
                  <span className="font-semibold">I will give it to them myself.</span>{" "}
                  We bring it to you on the day you choose. Once it is with you
                  the handover is between the two of you, and the cost of that
                  separate delivery comes out of your change.
                </span>
              </label>

              <div>
                <label className="label" htmlFor="deliverOn">
                  If you are giving it yourself, which day?
                </label>
                <input
                  id="deliverOn"
                  name="deliverOn"
                  className="field"
                  type="date"
                  min={room.closeDate}
                  max={room.exchangeDate}
                />
              </div>

              <button type="submit" className="btn-primary w-full">
                Save
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {me && room.status !== "open" && !match ? (
        <p className="card mt-6 text-sm text-muted">
          The room has been drawn. If you cannot see who you are buying for,
          message us.
        </p>
      ) : null}

      <p className="mt-6 break-words text-sm text-muted">
        Share this room: <span className="font-semibold">sudu.store/santa/{token}</span>
      </p>
    </div>
  );
}
