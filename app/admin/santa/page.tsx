import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { naira } from "@/lib/money";
import { runDateLabel } from "@/lib/time";
import { jobs, rooms } from "@/lib/santa-admin";
import { hasPaid, LEAST_MEMBERS } from "@/lib/santa";
import {
  addMember,
  markMemberPaid,
  markMemberUnpaid,
  agreeOverBudget,
  backToUs,
  drawRoom,
  markHandedOver,
  markRefunded,
  priceJob,
  saveWishPlan,
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
export default async function SantaAdminPage() {
  const [list, open] = await Promise.all([jobs(), rooms()]);

  const held = open.reduce((sum, one) => sum + one.held, 0);
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Held for members" value={held} money hint="Not ours" />
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
                  {one.wish ? one.wish.title : "Nothing picked yet"}
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
              {one.wish?.note ? (
                <p className="mt-1 text-sm">{one.wish.note}</p>
              ) : null}
              {one.wish && one.wish.estPrice > 0 ? (
                <p className="text-sm text-muted">
                  they thought about {naira(one.wish.estPrice)}
                </p>
              ) : null}

              <p className="mt-2 text-sm">
                <span className="font-semibold">{one.status}</span>
                {one.sourcedPrice !== null ? ` · paid ${naira(one.sourcedPrice)}` : ""}
                {one.refund !== null && one.refund > 0
                  ? ` · ${naira(one.refund)} back${one.refundedAt ? ", sent" : ", owing"}`
                  : ""}
              </p>

              {one.sourcedPrice !== null && one.sourcedPrice > one.budget && !one.refundedAt ? (
                <p className="mt-1 text-sm font-semibold text-brand">
                  {naira(one.sourcedPrice - one.budget)} over. Ask {one.buyer} on{" "}
                  {one.buyerPhone} before buying.
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <form action={priceJob} className="flex items-end gap-2">
                  <input type="hidden" name="orderId" value={one.orderId} />
                  <input type="hidden" name="budget" value={one.budget} />
                  <div>
                    <label className="label">What it cost</label>
                    <input
                      name="sourcedPrice"
                      className="field w-32"
                      type="number"
                      min={0}
                      defaultValue={one.sourcedPrice ?? ""}
                    />
                  </div>
                  <button className="btn-primary">Save</button>
                </form>

                {one.status === "asking" ? (
                  <form action={agreeOverBudget}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <button className="btn-quiet">They agreed</button>
                  </form>
                ) : null}

                {one.status !== "bought" && one.status !== "delivered" ? (
                  <form action={setStatus}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <input type="hidden" name="status" value="bought" />
                    <button className="btn-quiet">Bought</button>
                  </form>
                ) : null}

                {one.byHand && !one.handedOverAt ? (
                  <>
                    <form action={markHandedOver}>
                      <input type="hidden" name="orderId" value={one.orderId} />
                      <button className="btn-quiet">Given to {one.buyer}</button>
                    </form>
                    <form action={backToUs}>
                      <input type="hidden" name="orderId" value={one.orderId} />
                      <button className="btn-quiet">
                        Could not reach them, we deliver
                      </button>
                    </form>
                  </>
                ) : null}

                {!one.byHand && one.status !== "delivered" ? (
                  <form action={setStatus}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <input type="hidden" name="status" value="delivered" />
                    <button className="btn-quiet">Delivered</button>
                  </form>
                ) : null}

                {one.refund !== null && one.refund > 0 && !one.refundedAt ? (
                  <form action={markRefunded}>
                    <input type="hidden" name="orderId" value={one.orderId} />
                    <button className="btn-quiet">
                      Refunded {naira(one.refund)}
                    </button>
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

      <h2 className="section-title mb-2">Rooms</h2>
      {open.length === 0 ? (
        <p className="card text-muted">No rooms yet.</p>
      ) : (
        <ul className="space-y-3">
          {open.map((room) => (
            <li key={room.id} className="card">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{room.name}</p>
                <p className="text-sm text-muted">
                  {room.status} · closes {runDateLabel(room.closeDate)} · exchanged{" "}
                  {runDateLabel(room.exchangeDate)}
                </p>
              </div>
              <p className="text-sm text-muted">
                {naira(room.budget)} each · {room.members} in ·{" "}
                <span className="font-semibold">{room.paidCount} paid</span> ·{" "}
                {room.withLists} with lists · {room.picked} picked · holding{" "}
                {naira(room.held)}
              </p>

              {/* Who is in, and who has actually paid. The number sits
                * beside the name because a bank statement gives a name that
                * is half the time somebody's father's, and an amount that
                * everybody in the room has also paid. */}
              <ul className="mt-3 space-y-1">
                {room.people.map((one) => (
                  <li key={one.id} className="border-t pt-2 text-sm first:border-t-0">
                    <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{one.name}</span>
                    <span className="text-muted">{one.phone}</span>
                    <span className="font-mono text-xs text-muted">{one.reference}</span>
                    {one.hostel ? (
                      <span className="text-xs text-muted">{one.hostel}</span>
                    ) : (
                      <span className="text-xs font-semibold text-brand">no block</span>
                    )}
                    {hasPaid(one) ? (
                      <>
                        <span className="chip border-mint/40 bg-mint/10 py-0.5 text-xs text-mint">
                          paid
                        </span>
                        {room.status === "open" ? (
                          <form action={markMemberUnpaid}>
                            <input type="hidden" name="memberId" value={one.id} />
                            <button className="text-xs font-semibold text-muted underline">
                              undo
                            </button>
                          </form>
                        ) : null}
                      </>
                    ) : (
                      <span className="chip border-brand/40 bg-brand/10 py-0.5 text-xs text-brand">
                        not paid
                      </span>
                    )}
                    </div>

                    {/* What they asked for, so the hard ones can be looked
                      * for before anybody has picked anything. Half of what
                      * students want takes a week to find, and that is a
                      * week nobody has in December. */}
                    {one.wishes.length > 0 ? (
                      <ul className="mt-1.5 space-y-1.5 pl-1">
                        {one.wishes.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            {item.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.photoUrl}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded object-cover"
                              />
                            ) : null}
                            <div>
                              <p>
                                {item.title}
                                {item.estPrice > 0 ? (
                                  <span
                                    className={
                                      item.estPrice > room.budget
                                        ? "font-semibold text-brand"
                                        : "text-muted"
                                    }
                                  >
                                    {" "}
                                    · {naira(item.estPrice)}
                                    {item.estPrice > room.budget ? " over" : ""}
                                  </span>
                                ) : null}
                              </p>
                              {item.note ? (
                                <p className="text-xs text-muted">{item.note}</p>
                              ) : null}

                              {/* The shop's side. Filled in now rather than
                                * when somebody picks it, because the things
                                * that take a week to find are knowable in
                                * November. */}
                              <form
                                action={saveWishPlan}
                                className="mt-1.5 flex flex-wrap items-end gap-2"
                              >
                                <input type="hidden" name="wishId" value={item.id} />
                                <div>
                                  <label className="label text-xs">Costs us</label>
                                  <input
                                    name="costPrice"
                                    className="field w-28 py-1.5 text-sm"
                                    type="number"
                                    min={0}
                                    defaultValue={item.costPrice || ""}
                                  />
                                </div>
                                <div>
                                  <label className="label text-xs">We charge</label>
                                  <input
                                    name="sellPrice"
                                    className="field w-28 py-1.5 text-sm"
                                    type="number"
                                    min={0}
                                    defaultValue={item.sellPrice || ""}
                                  />
                                </div>
                                <div>
                                  <label className="label text-xs">Where from</label>
                                  <input
                                    name="source"
                                    className="field w-52 py-1.5 text-sm"
                                    defaultValue={item.source}
                                    placeholder="Balogun, second floor"
                                  />
                                </div>
                                <button className="btn-quiet px-4 py-1.5 text-sm">
                                  Save
                                </button>
                                {item.costPrice > 0 && item.sellPrice > 0 ? (
                                  <span
                                    className={
                                      item.sellPrice - item.costPrice >= 0
                                        ? "pb-2 text-xs font-semibold text-mint"
                                        : "pb-2 text-xs font-semibold text-brand"
                                    }
                                  >
                                    {naira(item.sellPrice - item.costPrice)} margin
                                  </span>
                                ) : null}
                              </form>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-muted">No list yet.</p>
                    )}
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
                      <button className="btn-primary">
                        Mark paid {naira(room.budget)}
                      </button>
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
                    <button className="btn-primary">Paid, add them</button>
                  </form>
                  <p className="mt-1.5 text-sm text-muted">
                    For somebody who paid in cash or never opened the link.
                    Adding them does not mark them paid.
                  </p>

                  <form action={drawRoom} className="mt-3">
                    <input type="hidden" name="roomId" value={room.id} />
                    <button
                      className="btn-quiet"
                      disabled={room.paidCount < LEAST_MEMBERS}
                    >
                      {room.paidCount < LEAST_MEMBERS
                        ? `${LEAST_MEMBERS - room.paidCount} more paid needed to draw`
                        : `Close and draw ${room.paidCount}`}
                    </button>
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
