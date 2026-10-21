import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { naira } from "@/lib/money";
import { runDateLabel } from "@/lib/time";
import { jobs, rooms } from "@/lib/santa-admin";
import { hasPaid, LEAST_MEMBERS, santaDelivery } from "@/lib/santa";
import ActionButton from "@/components/ActionButton";
import SaveButton from "@/components/SaveButton";
import CopyText from "@/components/CopyText";
import { lagosToday } from "@/lib/time";
import { siteUrl } from "@/lib/admin-templates";
import {
  addMember,
  startRoom,
  markMemberPaid,
  markMemberUnpaid,
  removeMember,
  removeRoom,
  agreeOverBudget,
  backToUs,
  drawRoom,
  markHandedOver,
  markRefunded,
  priceJob,
  setStatus,
} from "./actions";

export const dynamic = "force-dynamic";

/**
 * Secret Santa, from the other side.
 *
 * Two lists. What is to be bought and carried, soonest first, which is the
 * one somebody works from; and the rooms, which is where the money is.
 *
 * The buying list is deliberately not grouped by room. A room is how the
 * money is counted. A day is what gets packed into a car, and a gift whose
 * buyer is handing it over themselves is wanted on their day, not on the
 * exchange day. Grouping by room is how that gift ends up in the wrong car.
 */
export default async function SantaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ made?: string; problem?: string }>;
}) {
  const said = await searchParams;
  const [list, open, fee] = await Promise.all([jobs(), rooms(), santaDelivery()]);

  const held = open.reduce((sum, one) => sum + one.held, 0);
  // The errand fees inside that, which are takings rather than somebody's
  // money being looked after.
  const fees = open.reduce((sum, one) => sum + one.fees, 0);
  const owing = open.reduce((sum, one) => sum + one.owing, 0);
  const toBuy = list.filter((one) => one.status !== "delivered");
  const late = list.filter((one) => one.late);
  const asking = list.filter((one) => one.status === "asking");
  const toRefund = list.filter(
    (one) => one.refund !== null && one.refund > 0 && !one.refundedAt
  );

  return (
    <div>
      <PageHeader
        title="Secret Santa"
        detail="Rooms, and every gift still to be found or carried. Money held here belongs to the people who paid it and is not takings."
        backHref="/admin"
        backLabel="Dashboard"
      />

      {/* The one number that decides what a budget actually buys, said here
        * because this is the page somebody is on when they wonder. */}
      <p className="mb-4 text-sm text-muted">
        {fee.base > 0
          ? `Carrying somebody's gifts takes ${naira(fee.base)} out of their budget, for up to ${fee.included} ${fee.included === 1 ? "thing" : "things"}${fee.extra > 0 ? `, then ${naira(fee.extra)} each` : ""}.`
          : "Carrying a gift takes nothing out of the budget yet."}{" "}
        {/* To the card, not to the top of a page of twenty-six of them.
            Settings has had an anchor on every panel for a while; this was
            the one sentence pointing at a setting that did not use one. */}
        <Link className="font-semibold text-brand underline" href="/admin/settings#santa">
          {fee.base > 0 ? "Change it in Settings" : "Set it in Settings"}
        </Link>
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Held for members"
          value={held - fees}
          money
          hint={fees > 0 ? `Not ours · ${naira(fees)} of fees on top` : "Not ours"}
        />
        <Stat label="Still owed out" value={owing} money />
        <Stat label="Gifts to go" value={toBuy.length} />
        <Stat
          label="Past their day"
          value={late.length}
          tone={late.length > 0 ? "warn" : undefined}
        />
      </div>

      {asking.length > 0 ? (
        <p className="card mb-4 border-brand/30 bg-brand/5 font-semibold">
          {asking.length} {asking.length === 1 ? "gift is" : "gifts are"} over
          budget and waiting on the buyer.
        </p>
      ) : null}

      <h2 className="section-title mb-2">To buy and carry</h2>
      {list.length === 0 ? (
        <p className="card mb-6 text-muted">
          Nothing yet. Gifts appear here once a room is drawn and somebody has
          picked something.
        </p>
      ) : (
        <ul className="mb-6 space-y-3">
          {list.map((one) => (
            <li key={one.orderId} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">
                  {one.wishes.length === 0
                    ? "Nothing picked yet"
                    : one.wishes.map((item) => item.title).join(" + ")}
                </p>
                <p className={one.late ? "font-bold text-brand" : "text-sm text-muted"}>
                  {one.wantedOn ? runDateLabel(one.wantedOn) : "no date"}
                  {one.byHand ? " · to the buyer" : ""}
                  {one.late ? " · late" : ""}
                </p>
              </div>

              <p className="text-sm text-muted">
                {one.roomName} · {one.buyer} buying for {one.forWhom} · budget{" "}
                {naira(one.budget)}
                {one.toSpend !== one.budget
                  ? ` · ${naira(one.toSpend)} to spend after fetching`
                  : ""}
              </p>
              <p className="text-sm">
                {one.byHand ? (
                  <>to {one.buyer} to hand over</>
                ) : one.forWhomHostel ? (
                  <>to {one.forWhomHostel}</>
                ) : (
                  <span className="font-semibold text-brand">
                    {one.forWhom} has not said which block. Ask before the day.
                  </span>
                )}
              </p>
              {/* Each one on its own line, with what they guessed it
                * costs: a list of five small things is five errands and
                * reading them off one run-on line is how one is missed. */}
              {one.wishes.length > 0 ? (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {one.wishes.map((item, at) => (
                    <li key={`${item.title}-${at}`}>
                      {item.title}
                      {item.note ? <span className="text-muted"> · {item.note}</span> : null}
                      {item.estPrice > 0 ? (
                        <span className="text-muted"> · they thought {naira(item.estPrice)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-2 text-sm">
                <span className="font-semibold">{one.status}</span>
                {one.sourcedPrice !== null ? ` · paid ${naira(one.sourcedPrice)}` : ""}
                {one.refund !== null && one.refund > 0
                  ? ` · ${naira(one.refund)} back${one.refundedAt ? ", sent" : ", owing"}`
                  : ""}
              </p>

              {one.sourcedPrice !== null && one.sourcedPrice > one.toSpend && !one.refundedAt ? (
                <p className="mt-1 text-sm font-semibold text-brand">
                  {naira(one.sourcedPrice - one.toSpend)} over. Ask {one.buyer} on{" "}
                  {one.buyerPhone} before buying.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <form action={priceJob} className="flex items-end gap-2">
                  <input type="hidden" name="orderId" value={one.orderId} />
                  <input type="hidden" name="budget" value={one.toSpend} />
                  <div>
                    <label className="label">
                      What it all cost · {naira(one.toSpend)} to spend
                    </label>
                    <input
                      name="sourcedPrice"
                      className="field w-32"
                      type="number"
                      min={0}
                      defaultValue={one.sourcedPrice ?? ""}
                    />
                  </div>
                  <SaveButton>Save</SaveButton>
                </form>

                {one.status === "asking" ? (
                  <form action={agreeOverBudget}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <ActionButton className="btn-quiet" busy="…" done="Agreed ✓">
                      They agreed
                    </ActionButton>
                  </form>
                ) : null}

                {one.status !== "bought" && one.status !== "delivered" ? (
                  <form action={setStatus}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <input type="hidden" name="status" value="bought" />
                    <ActionButton className="btn-quiet" busy="…" done="Bought ✓">
                      Bought
                    </ActionButton>
                  </form>
                ) : null}

                {one.byHand && !one.handedOverAt ? (
                  <>
                    <form action={markHandedOver}>
                      <input type="hidden" name="orderId" value={one.orderId} />
                      <ActionButton className="btn-quiet" busy="…" done="Given ✓">
                        Given to {one.buyer}
                      </ActionButton>
                    </form>
                    <form action={backToUs}>
                      <input type="hidden" name="orderId" value={one.orderId} />
                      <ActionButton className="btn-quiet" busy="…" done="Back with us ✓">
                        Could not reach them, we deliver
                      </ActionButton>
                    </form>
                  </>
                ) : null}

                {!one.byHand && one.status !== "delivered" ? (
                  <form action={setStatus}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <input type="hidden" name="status" value="delivered" />
                    <ActionButton className="btn-quiet" busy="…" done="Delivered ✓">
                      Delivered
                    </ActionButton>
                  </form>
                ) : null}

                {one.refund !== null && one.refund > 0 && !one.refundedAt ? (
                  <form action={markRefunded}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <ActionButton className="btn-quiet" busy="…" done="Noted ✓">
                      Refunded {naira(one.refund)}
                    </ActionButton>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {toRefund.length > 0 ? (
        <p className="card mb-6 font-semibold">
          {toRefund.length} {toRefund.length === 1 ? "refund" : "refunds"} owing,{" "}
          {naira(toRefund.reduce((sum, one) => sum + (one.refund ?? 0), 0))} in all.
          They go back the same week, not after the event.
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">Rooms</h2>
        <Link className="text-sm font-semibold text-brand underline" href="/admin/santa/wishlists">
          Every wishlist, with prices
        </Link>
      </div>

      {/* The link, the moment it exists. A room is made in order to be
          pasted into a group chat, so the one thing to do next is right
          here rather than down the list. */}
      {said.made ? (
        <div className="card mb-3 border-l-[6px] border-l-mint">
          <p className="font-bold">Room made. Here is the link to send them.</p>
          <CopyText label="Share link" value={`${siteUrl()}/santa/${said.made}`} />
          <p className="hint mt-2">
            Whoever organises it can open that link, and they are the one who
            closes the room when everybody has paid.
          </p>
        </div>
      ) : null}

      {said.problem ? (
        <p className="card mb-3 border-l-[6px] border-l-brand font-semibold text-brand-dark">
          {said.problem}
        </p>
      ) : null}

      {/*
        * Starting one from this side of the counter.
        *
        * The public page is where a room normally begins, and that is the
        * right door. But the shop gets asked to set one up often enough,
        * over WhatsApp or in a DM by somebody who would rather we did it,
        * and the answer until now was to talk them through the form.
        *
        * Folded away, because the ordinary visit to this page is to work
        * the rooms that already exist rather than to make another.
        */}
      <details className="card mb-3">
        <summary className="cursor-pointer font-semibold">Start a room</summary>
        <form action={startRoom} className="mt-3 space-y-3">
          <div>
            <label className="label" htmlFor="room_name">
              What the room is called
            </label>
            <input
              id="room_name"
              name="name"
              required
              placeholder="Accounting 200 level"
              className="field"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="room_phone">
                Organiser&apos;s number
              </label>
              <input
                id="room_phone"
                name="phone"
                inputMode="tel"
                required
                placeholder="0803 123 4567"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="room_organiser">
                Organiser&apos;s name
              </label>
              <input id="room_organiser" name="organiser" className="field" />
            </div>
          </div>
          <p className="hint">
            The room is made in their name, not ours. They get the PIN, they
            close it when everybody has paid, and they are the one the group
            is relying on. A room owned by us is a room nobody in the group
            can do anything with.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="room_budget">
                Each pays
              </label>
              <input
                id="room_budget"
                name="budget"
                inputMode="numeric"
                required
                placeholder="20000"
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="room_close">
                Joining closes
              </label>
              <input
                id="room_close"
                name="closeDate"
                type="date"
                required
                defaultValue={lagosToday()}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="room_exchange">
                Gifts exchanged
              </label>
              <input
                id="room_exchange"
                name="exchangeDate"
                type="date"
                required
                className="field"
              />
            </div>
          </div>
          <p className="hint">
            Joining has to close before the exchange day, so there is time to
            draw the names and go and buy {LEAST_MEMBERS} or more gifts. The
            budget is the whole of what each person hands over; carrying
            comes out of it.
          </p>

          <SaveButton>Make the room</SaveButton>
        </form>
      </details>
      {open.length === 0 ? (
        <p className="card text-muted">No rooms yet.</p>
      ) : (
        <ul className="space-y-3">
          {open.map((room) => (
            <li key={room.id} className="card">
              {/* A room is a name, four numbers and a list of people, and on
                * a phone all of it was one run-on sentence of dot-separated
                * fragments. The name gets a line, the numbers get a grid,
                * and each person gets a block with their own white space. */}
              <p className="text-lg font-bold">{room.name}</p>
              <p className="mt-0.5 text-sm text-muted">
                {room.status} · closes {runDateLabel(room.closeDate)}
                <br />
                exchanged {runDateLabel(room.exchangeDate)}
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted">Each</dt>
                  <dd className="font-bold">{naira(room.budget)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">In the room</dt>
                  <dd className="font-bold">
                    {room.paidCount} paid
                    <span className="font-normal text-muted"> of {room.members}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Lists written</dt>
                  <dd className="font-bold">
                    {room.withLists}
                    <span className="font-normal text-muted"> · {room.picked} picked</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Holding for them</dt>
                  <dd className="font-bold">
                    {naira(room.held - room.fees)}
                    {room.fees > 0 ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · {naira(room.fees)} ours
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>

              {/* Who is in, and who has actually paid. The number sits under
                * the name because a bank statement gives a name that is half
                * the time somebody's father's, and an amount that everybody
                * in the room has also paid. */}
              <ul className="mt-4 space-y-3">
                {room.people.map((one) => (
                  <li key={one.id} className="rounded-xl bg-shell/60 p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">{one.name}</p>
                        <p className="text-muted">{one.phone}</p>
                        <p className="font-mono text-xs tracking-wider text-muted">
                          {one.reference}
                        </p>
                      </div>
                      {hasPaid(one) ? (
                        <span className="chip shrink-0 border-mint/40 bg-mint/10 py-0.5 text-xs text-mint">
                          paid
                        </span>
                      ) : (
                        <span className="chip shrink-0 border-brand/40 bg-brand/10 py-0.5 text-xs text-brand">
                          not paid
                        </span>
                      )}
                    </div>

                    <p className="mt-1.5 text-xs">
                      {one.hostel ? (
                        <span className="text-muted">{one.hostel}</span>
                      ) : (
                        <span className="font-semibold text-brand">no block yet</span>
                      )}
                      {one.wishes.length > 0 ? (
                        <span className="text-muted">
                          {" · "}
                          {one.wishes.length}{" "}
                          {one.wishes.length === 1 ? "thing" : "things"},{" "}
                          {one.wishes.filter((item) => item.costPrice > 0 && item.sellPrice > 0)
                            .length}{" "}
                          priced
                        </span>
                      ) : (
                        <span className="text-muted"> · no list yet</span>
                      )}
                    </p>

                    {/* The things that change something, on their own row,
                      * so a thumb aiming at one does not land on another. */}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {one.wishes.length > 0 ? (
                        <Link
                          className="text-xs font-semibold text-brand underline"
                          href={`/admin/santa/wishlists?q=${encodeURIComponent(one.phone)}`}
                        >
                          Open the list
                        </Link>
                      ) : null}
                      {hasPaid(one) && room.status === "open" ? (
                        <form action={markMemberUnpaid}>
                          <input type="hidden" name="memberId" value={one.id} />
                          <ActionButton
                            className="text-xs font-semibold text-muted underline"
                            doneClassName="text-mint"
                            busy="…"
                            done="Undone"
                          >
                            Undo paid
                          </ActionButton>
                        </form>
                      ) : null}
                      {/* Somebody who changed their mind rang us, not the
                        * room. Before the draw only: afterwards it is a ring
                        * and taking a link out of it breaks two gifts. */}
                      {room.status === "open" ? (
                        <form action={removeMember}>
                          <input type="hidden" name="memberId" value={one.id} />
                          <ConfirmButton
                            tone="bare"
                            className="text-xs font-semibold text-brand underline"
                            confirm={
                              hasPaid(one)
                                ? "Take out, and send their money back?"
                                : "Sure? Take them out"
                            }
                          >
                            Take out
                          </ConfirmButton>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>

              {room.status === "open" ? (
                <>
                  {room.people.some((one) => !hasPaid(one)) ? (
                    <form
                      action={markMemberPaid}
                      className="mt-3 flex flex-wrap items-end gap-2"
                    >
                      <div>
                        <label className="label">Whose money came in?</label>
                        <select name="memberId" className="field w-full sm:w-96">
                          {room.people
                            .filter((one) => !hasPaid(one))
                            .map((one) => (
                              <option key={one.id} value={one.id}>
                                {one.name} · {one.phone} · {one.reference}
                              </option>
                            ))}
                        </select>
                      </div>
                      <ActionButton className="btn-primary" busy="Marking…" done="Paid ✓">
                        Mark paid {naira(room.budget)}
                      </ActionButton>
                    </form>
                  ) : null}

                  <form action={addMember} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="roomId" value={room.id} />
                    <div>
                      <label className="label">Their number</label>
                      <input name="phone" className="field w-44" inputMode="tel" />
                    </div>
                    <div>
                      <label className="label">Their name</label>
                      <input name="name" className="field w-40" />
                    </div>
                    <ActionButton className="btn-primary" busy="Adding…" done="Added ✓">
                      Paid, add them
                    </ActionButton>
                  </form>
                  <p className="mt-1.5 text-sm text-muted">
                    For somebody who paid in cash or never opened the link.
                    Adding them does not mark them paid.
                  </p>

                  <form action={drawRoom} className="mt-3">
                    <input type="hidden" name="roomId" value={room.id} />
                    <ActionButton
                      className="btn-quiet"
                      busy="Drawing…"
                      done="Drawn ✓"
                      disabled={room.paidCount < LEAST_MEMBERS}
                    >
                      {room.paidCount < LEAST_MEMBERS
                        ? `${LEAST_MEMBERS - room.paidCount} more paid needed to draw`
                        : `Close and draw ${room.paidCount}`}
                    </ActionButton>
                  </form>
                </>
              ) : null}

              <p className="mt-2 break-words text-sm text-muted">
                sudu.store/santa/{room.shareToken}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
