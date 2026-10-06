import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { naira } from "@/lib/money";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { siteUrl } from "@/lib/admin-templates";
import CopyText from "@/components/CopyText";
import SantaHero from "@/components/SantaHero";
import SendLink from "@/components/SendLink";
import { runDateLabel } from "@/lib/time";
import { hostelNames } from "@/lib/hostels";
import {
  LEAST_MEMBERS,
  hasPaid,
  santaDelivery,
  matchFor,
  memberIn,
  myOrder,
  membersOf,
  roomByToken,
  wishesOf,
  type Wish,
} from "@/lib/santa";
import {
  agreeAction,
  closeRoomAction,
  joinRoomAction,
  kickMemberAction,
  leaveRoomAction,
  handoverAction,
  editRoomAction,
  pickWishAction,
  unpickWishAction,
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
  searchParams: Promise<{
    problem?: string;
    joined?: string;
    saved?: string;
    left?: string;
    removed?: string;
  }>;
}) {
  const { token } = await params;
  const { problem, joined, left, removed, saved } = await searchParams;

  const room = await roomByToken(token);
  if (!room) notFound();

  const settings = await safeSettings();
  const site = await siteUrl();
  const hostels = await hostelNames();
  // The budget is the whole of what somebody hands over, because that is
  // the number the group agreed out loud. Fetching comes out of it.
  const delivery = await santaDelivery();
  const due = room.budget;
  const chatToPay = whatsappLink(
    settings.whatsapp_number,
    `Hi Sudu, I'd like to pay for the ${room.name} Secret Santa by card.`
  );

  const phone = await currentCustomer();
  const known = phone ? await customerDetails(phone) : null;
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
          `${naira(due)} each`,
          `${room.status === "open" ? "closes" : "closed"} ${runDateLabel(room.closeDate)}`,
          `exchanged ${runDateLabel(room.exchangeDate)}`,
        ]}
      />

      {problem ? (
        <p className="card mt-4 border-brand/30 bg-brand/5 font-semibold text-brand">
          {problem}
        </p>
      ) : null}
      {/* Only when the room can actually see them. It said "you are in"
        * over the join form to somebody the page did not recognise, which
        * is the most confusing thing a page can do. */}
      {joined && me ? (
        <p className="card mt-4 border-mint/40 bg-mint/10 font-semibold">
          You are in. Write your wishlist below.
        </p>
      ) : null}

      {saved ? (
        <p className="card mt-4 border-mint/40 bg-mint/10 font-semibold">
          Saved. Everybody with the link sees the new one.
        </p>
      ) : null}
      {left ? (
        <p className="card mt-4 border-mint/40 bg-mint/10 font-semibold">
          You are out of this room. Anything you had paid comes back to you;
          message us if it has not by the end of the week.
        </p>
      ) : null}
      {removed ? (
        <p className="card mt-4 border-mint/40 bg-mint/10 font-semibold">
          Taken out of the room. Send their money back if they had paid.
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
            Free to join. Paying {naira(due)} is what puts you in the draw
            {delivery > 0
              ? `, and ${naira(delivery)} of that is what finds the gift and brings it over`
              : ""}
            .
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
              <div>
                <label className="label" htmlFor="hostel">
                  Which block is your gift delivered to?
                </label>
                {hostels.length > 0 ? (
                  <select
                    id="hostel"
                    name="hostel"
                    className="field"
                    defaultValue={known?.hostel ?? ""}
                  >
                    <option value="">Pick your block</option>
                    {hostels.map((one) => (
                      <option key={one} value={one}>
                        {one}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="hostel"
                    name="hostel"
                    className="field"
                    defaultValue={known?.hostel ?? ""}
                    placeholder="Queen Mary"
                  />
                )}
                <p className="mt-1.5 text-sm text-muted">
                  So we know where to bring it. You can change it later.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full">Join the room</button>

              {/* A different phone, or a browser that lost the cookie. The
                * room cannot tell them apart from a stranger, and joining
                * again would only say they are already in. */}
              {/* A PIN is written for everybody, but we have no way of
                * sending one by itself: it goes out by hand, to the number
                * it belongs to. So somebody who has never ordered has one
                * they have never seen, and the honest instruction is to
                * ask us for it rather than to go looking. */}
              <p className="text-sm text-muted">
                Joined already, on another phone?{" "}
                <Link
                  className="font-semibold text-brand underline"
                  href={`/orders?next=${encodeURIComponent(`/santa/${token}`)}`}
                >
                  Sign in with your number and PIN
                </Link>
                . Never been sent a PIN? Ask us there and we will send it to
                your number.
              </p>
            </>
          )}
        </form>
      ) : null}

      {/* In the room, not yet in the draw. */}
      {me && !hasPaid(me) && room.status === "open" ? (
        <section className="card mt-6 border-brand/30 bg-brand/5">
          <h2 className="font-bold">Pay {naira(due)} to be in the draw</h2>
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
              <dd className="font-semibold">{naira(due)}</dd>
            </div>
            {delivery > 0 ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">What that is</dt>
                <dd className="text-right">
                  up to {naira(room.budget - delivery)} on the gift, and{" "}
                  {naira(delivery)} to go and find it and bring it over
                </dd>
              </div>
            ) : null}
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

          {/* Quiet on purpose. Transfer is what nearly everybody does and
            * what costs the shop nothing; a card is for the one person it
            * is the difference between joining and not. */}
          {chatToPay ? (
            <p className="mt-3 text-sm text-muted">
              Would rather pay by card?{" "}
              <a className="font-semibold text-brand underline" href={chatToPay}>
                Message us
              </a>
              .
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Your list lives on its own page, and the link to it sits above the
        * roll call rather than under it. Below the list of who has joined
        * it was missed outright: somebody lands mid-page, scrolls past the
        * names straight to the share card, and never sees the one thing
        * they came to do. While the list is empty it is loud on purpose. */}
      {me ? (
        <Link
          href={`/santa/${token}/wishlist`}
          className={`card mt-6 flex items-center justify-between gap-3 transition hover:bg-black/[0.02] ${
            mine.length === 0 && room.status === "open"
              ? "border-brand/30 bg-brand/5"
              : ""
          }`}
        >
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-shell text-lg">
              🎁
            </span>
            <span>
              <span className="block font-bold">
                {mine.length === 0 && room.status === "open"
                  ? "Write your wishlist"
                  : "Your wishlist"}
              </span>
              <span className="block text-sm text-muted">
                {mine.length === 0
                  ? room.status === "open"
                    ? "Nothing on it yet. Whoever draws you picks from this."
                    : "You did not write one."
                  : `${mine.length} thing${mine.length === 1 ? "" : "s"} on it${
                      room.status === "open" ? "" : ", locked"
                    }`}
              </span>
            </span>
          </span>
          <span className="text-xl text-muted">›</span>
        </Link>
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
                {/* Whoever made the room is the one being asked why it has
                  * not been drawn, so taking out the person who joined and
                  * never paid is theirs to do. Not themselves: a room with
                  * nobody to close it is worse than a slow one. */}
                {phone === room.creatorPhone &&
                room.status === "open" &&
                one.phone !== room.creatorPhone ? (
                  <form action={kickMemberAction}>
                    <input type="hidden" name="token" value={token} />
                    <input type="hidden" name="memberId" value={one.id} />
                    <button type="submit" className="text-xs font-semibold text-brand underline">
                      Remove
                    </button>
                  </form>
                ) : null}
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

        {/* Theirs to change until it is drawn: a date moves, a budget is
          * argued down in the group chat, and a room named in a hurry gets
          * named properly later. Folded away because it is not what anybody
          * opens the page for. */}
        {phone === room.creatorPhone && room.status === "open" ? (
          <details className="mt-4 border-t pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-muted">
              Change the room
            </summary>
            <form action={editRoomAction} className="mt-3 space-y-3">
              <input type="hidden" name="token" value={token} />
              <div>
                <label className="label" htmlFor="roomName">What it is called</label>
                <input
                  id="roomName"
                  name="name"
                  className="field"
                  defaultValue={room.name}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="roomBudget">Each</label>
                <input
                  id="roomBudget"
                  name="budget"
                  className="field"
                  type="number"
                  min={0}
                  step={500}
                  defaultValue={room.budget}
                  required
                />
                {paid.length > 0 ? (
                  <p className="mt-1.5 text-sm text-muted">
                    {paid.length} {paid.length === 1 ? "person has" : "people have"} paid, so this one is fixed now.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="closeDate">Joining closes</label>
                  <input
                    id="closeDate"
                    name="closeDate"
                    className="field"
                    type="date"
                    defaultValue={room.closeDate}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="exchangeDate">Exchanged</label>
                  <input
                    id="exchangeDate"
                    name="exchangeDate"
                    className="field"
                    type="date"
                    defaultValue={room.exchangeDate}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-quiet w-full">Save the room</button>
            </form>
          </details>
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

        {me && room.status === "open" && phone !== room.creatorPhone ? (
          <details className="mt-4 border-t pt-3">
            <summary className="cursor-pointer text-sm text-muted">
              Leave this room
            </summary>
            <form action={leaveRoomAction} className="mt-2">
              <input type="hidden" name="token" value={token} />
              <p className="text-sm text-muted">
                Your list goes with you, and anything you paid comes back to
                you. You can only do this before names are drawn.
              </p>
              <button type="submit" className="btn-quiet mt-2 w-full">
                Leave the room
              </button>
            </form>
          </details>
        ) : null}

        {room.status === "open" ? (
          <p className="mt-3 text-sm text-muted">
            Once names are drawn you will see who you are buying for, pick
            something off their list, and choose whether we deliver it on the
            day or bring it to you to hand over yourself.
          </p>
        ) : null}
      </section>

      {/* After the draw. */}
      {match ? (
        <section className="card mt-6">
          <h2 className="font-bold">
            You are buying for {match.name}
            {match.hostel ? (
              <span className="font-normal text-muted"> · {match.hostel}</span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pick anything off their list, as many as the budget carries. We
            will find them, and if they come to more than{" "}
            {naira(match.toSpend)} we will ask you before buying anything.
            {match.delivery > 0
              ? ` Each thing is its own errand, so each one takes ${naira(match.delivery)} of the ${naira(match.budget)} to find and bring over.`
              : ""}
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
                    {one.photos.length > 0 ? (
                      <span className="flex shrink-0 gap-1">
                        {one.photos.map((shot) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={shot}
                            src={shot}
                            alt=""
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ))}
                      </span>
                    ) : null}
                    <div>
                    <p className="font-semibold">{one.title}</p>
                    {one.itemId ? (
                      <p className="text-xs font-semibold text-mint">
                        We sell this, so it is here already
                      </p>
                    ) : null}
                    {one.note ? <p className="text-sm text-muted">{one.note}</p> : null}
                    {one.estPrice > 0 ? (
                      <p className="text-sm text-muted">
                        about {naira(one.estPrice)}
                        {one.estPrice > match.toSpend ? (
                          <span className="font-semibold text-brand">
                            {" "}
                            · over budget, you would pay the difference
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    </div>
                  </div>
                  {match.pickedWishIds.includes(one.id) ? (
                    <form action={unpickWishAction}>
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="wishId" value={one.id} />
                      <span className="block text-sm font-bold text-mint">Picked</span>
                      <button type="submit" className="text-xs text-muted underline">
                        Take it off
                      </button>
                    </form>
                  ) : (
                    <form action={pickWishAction}>
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="wishId" value={one.id} />
                      <button type="submit" className="text-sm font-semibold text-brand">
                        {match.pickedWishIds.length > 0 ? "Add this too" : "Pick this"}
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Only once something is actually being found. The row can now
            * exist before that, because choosing who hands it over writes
            * it, and "we are looking for it" when nothing has been picked
            * is a lie. */}
          {order && match.pickedWishIds.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-bold">Where it has got to</h3>

              {order.status === "asking" && order.over > 0 ? (
                <div className="mt-2 space-y-3">
                  <p className="text-sm">
                    It comes to {naira(order.sourcedPrice ?? 0)}, which is{" "}
                    <span className="font-bold text-brand">
                      {naira(order.over)} over
                    </span>{" "}
                    the {naira(match.budget)} there was to spend. We have not
                    bought it.
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

          {/* Who carries it the last step. Not held back until something
            * has been picked: it is a decision about carrying rather than
            * about what is carried, and hiding it behind the pick meant
            * nothing on the page ever said the choice existed. */}
          <form action={handoverAction} className="mt-5 space-y-3 border-t pt-4">
            <input type="hidden" name="token" value={token} />
            <h3 className="font-bold">Who hands it over?</h3>
            <p className="text-sm text-muted">
              We can bring it with the rest of the gifts on the exchange day,
              or deliver it to you first so you can give it to them yourself.
            </p>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="byGiver"
                value="0"
                defaultChecked={order?.handover !== "giver"}
                className="mt-1"
              />
              <span>
                <span className="font-semibold">We deliver it</span> to{" "}
                {match.name} on {runDateLabel(match.exchangeDate)}, with
                everybody else's.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name="byGiver"
                value="1"
                defaultChecked={order?.handover === "giver"}
                className="mt-1"
              />
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
                defaultValue={order?.deliverOn ?? ""}
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Save
            </button>

            <p className="text-sm text-muted">
              {order?.handover === "giver"
                ? `Saved: it comes to you${order.deliverOn ? ` on ${runDateLabel(order.deliverOn)}` : ""}, and you hand it over.`
                : `Saved: we deliver it on ${runDateLabel(match.exchangeDate)}. You can change this until the day.`}
            </p>
          </form>
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
              message={`Join our Secret Santa on Sudu. ${naira(due)} each, names drawn ${runDateLabel(room.closeDate)}: ${site}/santa/${token}`}
              link={`${site}/santa/${token}`}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
