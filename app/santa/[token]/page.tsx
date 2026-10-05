import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentCustomer } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { safeSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import CopyText from "@/components/CopyText";
import SantaHero from "@/components/SantaHero";
import SendLink from "@/components/SendLink";
import { runDateLabel } from "@/lib/time";
import {
  LEAST_MEMBERS,
  MOST_WISHES,
  hasPaid,
  matchFor,
  memberIn,
  myOrder,
  membersOf,
  roomByToken,
  wishesOf,
  type Wish,
} from "@/lib/santa";
import {
  addWishAction,
  agreeAction,
  closeRoomAction,
  joinRoomAction,
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
  const site = await siteUrl();

  const phone = await currentCustomer();
  const me = phone ? await memberIn(room.id, phone) : null;
  const people = await membersOf(room.id);
  const mine = me ? await wishesOf(me.id) : [];
  const match = me && room.status !== "open" ? await matchFor(room.id, me.phone) : null;
  // The buyer's own order: their money, so their business. The person
  // receiving it never sees any of this.
  const order = me && room.status !== "open" ? await myOrder(room.id, me.phone) : null;

  const paid = people.filter(hasPaid);
  const lists = await Promise.all(
    people.map(async (one) => ({ id: one.id, has: (await wishesOf(one.id)).length > 0 }))
  );
  const written = new Set(lists.filter((one) => one.has).map((one) => one.id));

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <SantaHero
        kicker="Secret Santa"
        title={room.name}
        chips={[
          `${naira(room.budget)} each`,
          `${room.status === "open" ? "closes" : "closed"} ${runDateLabel(room.closeDate)}`,
          `exchanged ${runDateLabel(room.exchangeDate)}`,
        ]}
      />

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

      {/* Joining is free and puts you in the room. Paying is what puts
        * you in the draw, and they are two different days. Saying so here
        * is the difference between a room that fills up and a room nobody
        * can look inside until somebody has taken their money by hand. */}
      {!me ? (
        <form action={joinRoomAction} className="card mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <h2 className="font-bold">Join this room</h2>
          <p className="text-sm text-muted">
            Free to join. Paying {naira(room.budget)} is what puts you in the
            draw.
          </p>

          {room.status !== "open" ? (
            <p className="font-semibold text-brand">Joining has closed for this room.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="phone">Your number</label>
                  <input
                    id="phone"
                    name="phone"
                    className="field"
                    inputMode="tel"
                    defaultValue={phone ?? ""}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="name">Your name</label>
                  <input id="name" name="name" className="field" required />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">Join the room</button>
            </>
          )}
        </form>
      ) : null}

      {/* In the room, not yet in the draw. */}
      {me && !hasPaid(me) && room.status === "open" ? (
        <section className="card mt-6 border-brand/30 bg-brand/5">
          <h2 className="font-bold">Pay {naira(room.budget)} to be in the draw</h2>
          <p className="mt-1 text-sm text-muted">
            Write your list now. You are drawn once this lands.
          </p>

          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Bank</dt>
              <dd className="font-semibold">{settings.bank_name || "ask us"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Account</dt>
              <dd className="flex items-center gap-2 font-semibold">
                {settings.bank_account_number}
                <CopyText
                  value={settings.bank_account_number}
                  label="Copy"
                  className="px-3 py-1 text-xs"
                />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Name</dt>
              <dd className="font-semibold">{settings.bank_account_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Amount</dt>
              <dd className="font-semibold">{naira(room.budget)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm text-muted">Reference</p>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-2xl font-black tracking-wider">
              {me.reference}
            </p>
            <CopyText value={me.reference} label="Copy" className="px-3 py-1 text-xs" />
          </div>
          <p className="mt-1 text-sm text-muted">
            Put it in the transfer. It can take a few hours to show.
          </p>
        </section>
      ) : null}

      {/* Who is here. */}
      <section className="card mt-6">
        <h2 className="font-bold">
          {people.length} {people.length === 1 ? "person" : "people"} in
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {people.map((one) => (
            <li key={one.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-shell text-xs font-bold">
                  {one.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <span className="font-semibold">{one.name}</span>
              </span>
              <span className="flex items-center gap-2 text-muted">
                <span>{written.has(one.id) ? "list ready" : "no list yet"}</span>
                <span
                  className={
                    hasPaid(one)
                      ? "chip border-mint/40 bg-mint/10 py-0.5 text-xs text-mint"
                      : "chip border-brand/40 bg-brand/10 py-0.5 text-xs text-brand"
                  }
                >
                  {hasPaid(one) ? "paid" : "not paid"}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {room.status === "open" ? (
          <p className="mt-3 text-sm text-muted">
            Joining closes {runDateLabel(room.closeDate)}.{" "}
            {paid.length < LEAST_MEMBERS
              ? `${LEAST_MEMBERS - paid.length} more paid people needed to draw.`
              : `${paid.length} paid and in the draw.`}
          </p>
        ) : null}

        {phone === room.creatorPhone && room.status === "open" ? (
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
            Three to five things, so whoever drew you has a choice. Keep them
            near {naira(room.budget)}: anything over and whoever drew you has
            to pay the difference, so they will probably pick something else.
          </p>

          <ul className="mt-3 space-y-2">
            {mine.map((one: Wish) => (
              <li key={one.id} className="flex items-start justify-between gap-3 border-t pt-2">
                <div className="flex items-start gap-3">
                  {one.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={one.photoUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div>
                  <p className="font-semibold">{one.title}</p>
                  {one.note ? <p className="text-sm text-muted">{one.note}</p> : null}
                  {one.estPrice > 0 ? (
                    <p className="text-sm text-muted">
                      about {naira(one.estPrice)}
                      {one.estPrice > room.budget ? (
                        <span className="font-semibold text-brand">
                          {" "}
                          · over the {naira(room.budget)} budget
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  </div>
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
                <label className="label" htmlFor="photo">
                  A picture
                </label>
                <input
                  id="photo"
                  name="photo"
                  className="field"
                  type="file"
                  accept="image/*"
                />
                <p className="mt-1 text-sm text-muted">
                  A screenshot is usually the clearest way to say which one.
                </p>
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
                  <div className="flex items-start gap-3">
                    {one.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={one.photoUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : null}
                    <div>
                    <p className="font-semibold">{one.title}</p>
                    {one.note ? <p className="text-sm text-muted">{one.note}</p> : null}
                    {one.estPrice > 0 ? (
                      <p className="text-sm text-muted">
                        about {naira(one.estPrice)}
                        {one.estPrice > match.budget ? (
                          <span className="font-semibold text-brand">
                            {" "}
                            · over budget, you would pay the difference
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    </div>
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

          {order ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-bold">Where it has got to</h3>

              {order.status === "asking" && order.over > 0 ? (
                <div className="mt-2 space-y-3">
                  <p className="text-sm">
                    It comes to {naira(order.sourcedPrice ?? 0)}, which is{" "}
                    <span className="font-bold text-brand">
                      {naira(order.over)} over
                    </span>{" "}
                    the {naira(match.budget)} budget. We have not bought it.
                  </p>
                  <p className="text-sm text-muted">
                    Pay the difference and we will get it, or pick something
                    else off the list above and we will start again.
                  </p>
                  <form action={agreeAction}>
                    <input type="hidden" name="token" value={token} />
                    <button type="submit" className="btn-primary w-full">
                      I will pay the {naira(order.over)}
                    </button>
                  </form>
                </div>
              ) : (
                <p className="mt-2 text-sm">
                  {order.status === "sourcing" ? "We are looking for it." : null}
                  {order.status === "buying"
                    ? order.agreedAt
                      ? "You agreed the extra. We are buying it."
                      : "Found, and we are buying it."
                    : null}
                  {order.status === "bought"
                    ? order.handover === "giver"
                      ? `Bought. It comes to you${order.deliverOn ? ` on ${runDateLabel(order.deliverOn)}` : ""}.`
                      : `Bought. It goes out on ${runDateLabel(match.exchangeDate)}.`
                    : null}
                  {order.status === "delivered"
                    ? order.handedOverAt
                      ? "With you. The rest is between the two of you."
                      : "Delivered."
                    : null}
                  {order.status === "stuck"
                    ? "We cannot find this one. We will message you about the next thing on their list."
                    : null}
                </p>
              )}

              {order.refund !== null && order.refund > 0 ? (
                <p className="mt-2 text-sm text-muted">
                  {naira(order.refund)} of your {naira(match.budget)} is coming
                  back to you
                  {order.refundedAt ? ", and has been sent." : " this week."}
                </p>
              ) : null}
            </div>
          ) : null}

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

      {room.status === "open" ? (
        <section className="card mt-6">
          <h2 className="font-bold">Fill the room</h2>
          <p className="mt-1 text-sm text-muted">
            Send this to the group. Anybody with it can join.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SendLink
              message={`Join our Secret Santa on Sudu. ${naira(room.budget)} each, names drawn ${runDateLabel(room.closeDate)}: ${site}/santa/${token}`}
              link={`${site}/santa/${token}`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
