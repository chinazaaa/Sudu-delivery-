import SaveButton from "@/components/SaveButton";
import { deliverySlots } from "@/lib/same-day";
import { deliveryHours } from "@/lib/settings";
import { moveSameDayCar, raiseMenuPrice, setCounterSpend } from "@/app/admin/actions";
import ShortGroups from "@/components/admin/ShortGroups";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import HandoutList from "@/components/HandoutList";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import Tabs from "@/components/admin/Tabs";
import Checklist from "@/components/admin/Checklist";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ActionButton from "@/components/admin/ActionButton";
import StagePicker from "@/components/admin/StagePicker";
import SendSheet from "@/components/admin/SendSheet";
import { payableAccounts } from "@/lib/banks";
import { batchSheet, typicalCosts, shortfalls } from "@/lib/admin";
import { SLOT_LABEL } from "@/lib/config";
import Link from "next/link";
import { naira, orderRef, refsIn } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { clockLabel, runDateLabel } from "@/lib/time";
import { bandTable, parseBands } from "@/lib/fees";
import { narration, template, whatsappTo } from "@/lib/messages";
import { getSettings } from "@/lib/settings";
import { sheetAsText } from "@/lib/sheet-text";
import { STAGES, STAGE_ACTION, STAGE_LABEL, stageIndex } from "@/lib/stages";
import {
  markDelivered,
  markPaid,
  refundOrder,
  setBatchCapacity,
  setBatchStage,
  setBagDelivered,
  setBatchStatus,
  setFlashFee,
  setRunCosts,
  updateRun,
  deleteRun,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sheet = await batchSheet((await params).id);
  if (!sheet) notFound();

  const { batch, counter, handout, unpaid, summary, refunds, groupsShort, pins } = sheet;

  // One wording for a share, here and in the message the customer gets:
  // #1001a and #1001b, never #1001 on this screen and #1001a on theirs.
  const refs = refsIn([...handout.flatMap((bag) => bag.orders), ...unpaid]);
  const refFor = (order: { id: string; order_no: number | null }) =>
    refs.get(order.id) ?? orderRef(order);
  // A run nobody has ordered into is still just a plan: it can be moved to
  // another day, or dropped altogether.
  const empty = summary.paidCount + summary.unpaidCount === 0;
  // Past the counter, the shopping is done and the list is history. Past the
  // handout, so is the run.
  const shopped = stageIndex(batch.stage) >= stageIndex("on_the_road");
  const finished = batch.stage === "handed_out";
  const belowMinimum = summary.paidCount < summary.minimum;

  // Before a run is driven nobody has entered its fuel or driver, so profit
  // reads high at exactly the moment the decision to drive is made. What past
  // runs actually cost is a far better guess than nothing.
  const usual = summary.costs === 0 ? await typicalCosts() : null;
  // Windows a car could be moved into, when it is a car and nothing has been
  // bought for it yet.
  const windows =
    batch.kind === "same_day" && batch.stage === "ordering"
      ? await deliverySlots(new Date(), await deliveryHours())
      : [];
  // Shared deliveries where somebody has not paid, and what that leaves the
  // car short by.
  const short = await shortfalls(batch.id);
  const likely = usual === null ? null : summary.profit - usual;

  const settings = await getSettings();
  // The account the payment message quotes: the first on the list.
  const bank = (await payableAccounts(settings))[0] ?? null;
  const bands = parseBands(settings.fee_bands);
  // Links inside the messages have to be absolute, so they are built from the
  // request rather than from another environment variable to keep in sync.
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const siteUrl = host ? `${proto}://${host}` : "";
  const batchLabel = `${runDateLabel(batch.run_date)} ${SLOT_LABEL[batch.slot]}`;

  // The wording is whatever the admin has written in settings, so one edit
  // changes the message everywhere it is offered.
  const messageFor = (order: (typeof unpaid)[number]) =>
    whatsappTo(
      order.customer_phone,
      template({
        kind: order.status === "pending" ? "payment" : "confirmed",
        order,
        settings,
        pin: pins[order.customer_phone] ?? null,
        siteUrl,
        batchLabel,
        deliveryWindow: batch.delivery_window_text,
        bank,
      })
    );

  return (
    <div>
      <PageHeader
        title={batchLabel}
        detail={`Closes ${clockLabel(batch.cut_off_at)} · ${batch.delivery_window_text} · ${STAGE_LABEL[batch.stage]}`}
        backHref="/admin/runs"
        backLabel="All runs"
        actions={
          <>
            <StagePicker
              batchId={batch.id}
              stage={batch.stage}
              action={setBatchStage}
            />
            <SendSheet
              batchId={batch.id}
              open={batch.status === "open" && batch.stage === "ordering"}
              closeRun={setBatchStage}
              href={whatsappTo(
                settings.whatsapp_number || "0",
                sheetAsText(sheet, batchLabel)
              )}
            />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Paid orders"
          value={`${summary.paidCount}/${summary.minimum}`}
          tone={belowMinimum ? "warn" : "good"}
          hint={`${summary.unpaidCount} unpaid`}
        />
        <Stat label="Money collected" value={summary.gross} money />
        <Stat
          label="Pay at counters"
          value={summary.foodCost}
          money
          hint={`${counter.length} stop${counter.length === 1 ? "" : "s"}`}
        />
        <Stat
          label="Profit"
          value={summary.profit}
          money
          tone={summary.profit >= 0 ? "good" : "warn"}
          hint={
            summary.costs > 0
              ? `after ${naira(summary.costs)} fuel and driver`
              : "fuel and driver not entered yet"
          }
        />
      </div>

      {/* A plain verdict while the run can still be called off. The numbers
          above are all there, but at cut off what is wanted is the answer, not
          the arithmetic. */}
      {batch.stage !== "handed_out" && likely !== null && (
        <p
          className={`mb-4 rounded-2xl px-4 py-3 text-sm ${
            likely >= 0 ? "bg-mint/10 text-mint" : "bg-amber-50 text-amber-800"
          }`}
        >
          <span className="font-bold">
            {likely >= 0
              ? `Worth driving: about ${naira(likely)} left over.`
              : `This run loses about ${naira(Math.abs(likely))}.`}
          </span>{" "}
          {naira(summary.gross)} paid in, {naira(summary.foodCost)} to the counters,
          and roughly {naira(usual!)} of fuel and driver going by the last few runs.
          Put this run&apos;s real costs in under Profit and this becomes exact.
        </p>
      )}

      {short.length > 0 && (
        <section className="card mb-4 space-y-3">
          <div>
            <h2 className="font-bold">Shared deliveries waiting on money</h2>
            <p className="text-sm text-muted">
              Everybody in one pays an even share of a single fee. When some of them
              never pay, their food does not travel, but the fee for what is left
              does not fall as fast as the heads do. Nobody can be asked for more
              after the fact, so this is a judgement: chase them, carry it, or
              refund the ones who paid.
            </p>
          </div>
          {short.map((one) => (
            <div key={one.groupId} className="rounded-xl border border-black/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">{one.leader}&apos;s delivery</span>
                <span className="text-sm text-muted">
                  {one.paidPeople} of {one.people} paid
                </span>
              </div>
              {one.short > 0 ? (
                <p className="mt-1 text-sm">
                  You hold <span className="font-semibold">{naira(one.collected)}</span>{" "}
                  of delivery. What still travels is worth{" "}
                  <span className="font-semibold">{naira(one.needed)}</span>, so it is{" "}
                  <span className="font-bold text-brand">{naira(one.short)} short</span>.
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  The money in still covers what travels. Nothing to do but chase.
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm">
                {one.unpaid.map((who) => (
                  <li key={who.id} className="flex items-center justify-between gap-3">
                    <span>
                      {who.name}
                      <span className="text-muted"> · owes {naira(who.owed)}</span>
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <a
                        href={`tel:${who.phone}`}
                        className="chip border-black/10 bg-white py-1 text-xs"
                      >
                        Call
                      </a>
                      <Link
                        href={`/admin/orders/${who.id}`}
                        className="chip border-black/10 bg-white py-1 text-xs"
                      >
                        Open
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {belowMinimum && (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Below the {summary.minimum}-order minimum. Cancel and refund in full, or
          carry it. A short batch loses money the next one has to cover.
        </p>
      )}

      <Tabs
        sections={[
          {
            id: "counter",
            label: "At the counter",
            badge: String(counter.length),
            content: (
              <>
                {shopped && (
                  <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm font-semibold text-mint">
                    {finished
                      ? "This run is finished. The list is here for the record, and what you actually paid still goes in below."
                      : "The food is bought and on the road. The list is here for the record, and what you actually paid still goes in below."}
                  </p>
                )}

                <section className="card">
                  <h2 className="font-bold">What you pay, stop by stop</h2>
                  <p className="text-sm text-muted">
                    Paid orders only. This is the money that leaves your hand at
                    each restaurant. Tick things off as you buy them; the ticks
                    are yours alone and change nothing.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {counter.map((group) => (
                      <li key={group.restaurant} className="flex justify-between gap-3">
                        <span>{group.restaurant}</span>
                        <span className="font-semibold">
                          {naira(group.expectedFoodTotal)}
                        </span>
                      </li>
                    ))}
                    {counter.length === 0 && (
                      <li className="text-muted">Nothing paid for yet.</li>
                    )}
                    <li className="flex justify-between gap-3 border-t border-black/10 pt-2 font-extrabold">
                      <span>{counter.length} stops</span>
                      <span>{naira(summary.foodCost)}</span>
                    </li>
                  </ul>
                </section>

                {batch.kind === "same_day" && batch.stage === "ordering" && (
                  <section className="card space-y-3">
                    <div>
                      <h2 className="font-bold">Move this car</h2>
                      <p className="text-sm text-muted">
                        Ring them, ask whether another window suits, and put it
                        here. A car moved into a window somebody else already
                        asked for becomes one trip with theirs, which is one
                        walk to the counter instead of two. Nobody is told by
                        this: the agreement happened on the phone.
                      </p>
                    </div>
                    <form action={moveSameDayCar} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <div className="min-w-0 flex-1">
                        <label className="label" htmlFor="deliver_at">
                          Which window instead?
                        </label>
                        <select id="deliver_at" name="deliver_at" className="field">
                          {windows.map((slot) => (
                            <option key={slot.at} value={slot.at}>
                              {slot.label}
                              {slot.at === batch.deliver_at && " · where it is now"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <SaveButton quiet>Move it</SaveButton>
                    </form>
                    {windows.length === 0 && (
                      <p className="text-sm text-muted">
                        Nothing else can be reached today.
                      </p>
                    )}
                  </section>
                )}

                {counter.length > 0 && (
                  <section className="card space-y-3">
                    <div>
                      <h2 className="font-bold">What it actually cost</h2>
                      <p className="text-sm text-muted">
                        Only the ones that were different. Most of a run is
                        exactly the menu price, so nothing is listed until you
                        say otherwise: pick the thing whose price moved and type
                        what you really handed over.
                      </p>
                    </div>

                    {/* The books for the run, once anything has been typed:
                        what the menu said against what the counters took, so
                        the end of the day is one line rather than a scroll
                        back through every item. */}
                    {summary.reconciled.lines > 0 && (
                      <div className="rounded-xl bg-black/[0.03] p-3">
                        <p className="text-sm">
                          <span className="font-bold">
                            {summary.reconciled.lines} of {summary.reconciled.of}
                          </span>{" "}
                          {summary.reconciled.lines === 1 ? "line" : "lines"} put
                          in. The menu said{" "}
                          <span className="font-bold">{naira(summary.reconciled.menu)}</span>{" "}
                          for them and you handed over{" "}
                          <span className="font-bold">{naira(summary.reconciled.paid)}</span>
                          {summary.reconciled.recovered > 0 && (
                            <>
                              , with {naira(summary.reconciled.recovered)} back from
                              customers
                            </>
                          )}
                          .
                        </p>
                        {(() => {
                          const out =
                            summary.reconciled.paid -
                            summary.reconciled.recovered -
                            summary.reconciled.menu;
                          return (
                            <p
                              className={`mt-1 text-sm font-bold ${
                                out <= 0 ? "text-mint" : "text-brand"
                              }`}
                            >
                              {out === 0
                                ? "Level with the menu so far."
                                : out < 0
                                  ? `${naira(Math.abs(out))} better than the menu, straight onto the profit.`
                                  : `${naira(out)} worse than the menu, straight off the profit.`}
                            </p>
                          );
                        })()}
                        <p className="mt-1 text-xs text-muted">
                          Everything not listed here stays at the menu price, so
                          this is honest even half done. The run&apos;s profit
                          above already counts it.
                        </p>
                      </div>
                    )}

                    {/* What has already been said, so it can be corrected or
                        put back without hunting for it. */}
                    {counter.flatMap((group) =>
                      group.lines
                        .filter((line) => line.paid !== null)
                        .map((line) => (
                          <form
                            key={`fixed-${line.key}`}
                            action={setCounterSpend}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2"
                          >
                            <input type="hidden" name="batch_id" value={batch.id} />
                            <input type="hidden" name="line_key" value={line.key} />
                            <span className="min-w-0 text-sm">
                              <span className="font-semibold">
                                {line.qty}× {line.name}
                              </span>
                              <span className="block text-xs text-muted">
                                {group.restaurant} · menu says{" "}
                                {naira(line.qty * line.unitPrice)}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <input
                                name="paid"
                                inputMode="numeric"
                                defaultValue={line.paid ?? ""}
                                aria-label={`What you paid for ${line.name}`}
                                className="field w-24 py-1.5 text-sm"
                              />
                              {/* Only where the gap is big enough to have been
                                  worth asking about. Nobody chases two hundred
                                  naira, and offering the box invites a figure
                                  that was never collected. */}
                              {(line.paid ?? 0) > line.qty * line.unitPrice && (
                                <input
                                  name="recovered"
                                  inputMode="numeric"
                                  defaultValue={line.recovered || ""}
                                  placeholder="they paid back"
                                  aria-label={`What the customer gave back for ${line.name}`}
                                  className="field w-32 py-1.5 text-sm"
                                />
                              )}
                              {(line.paid ?? 0) <= line.qty * line.unitPrice && (
                                <input type="hidden" name="recovered" value={line.recovered || ""} />
                              )}
                              {line.paid !== line.qty * line.unitPrice && (
                                <span
                                  className={`text-xs font-bold ${
                                    (line.paid ?? 0) < line.qty * line.unitPrice
                                      ? "text-mint"
                                      : "text-brand-dark"
                                  }`}
                                >
                                  {(line.paid ?? 0) < line.qty * line.unitPrice ? "+" : "−"}
                                  {naira(
                                    Math.abs(
                                      line.qty * line.unitPrice -
                                        ((line.paid ?? 0) - line.recovered)
                                    )
                                  )}
                                </span>
                              )}
                              <SaveButton quiet>Save</SaveButton>
                            </span>
                          </form>
                        ))
                    )}

                    {/* Paid more than the menu says, on something whose price
                        has probably just gone up. Offered rather than done:
                        the figure came from a phone at a counter, and a
                        slipped digit must not raise a price nobody meant to
                        raise. Nothing is offered when it came in under,
                        because that is usually a promo and following it down
                        would cut the shop's price on one afternoon. */}
                    {counter.flatMap((group) =>
                      group.lines
                        .filter(
                          (line) =>
                            line.paid !== null && line.paid > line.qty * line.unitPrice
                        )
                        .map((line) => {
                          const upBy = Math.ceil(
                            ((line.paid ?? 0) - line.qty * line.unitPrice) / line.qty
                          );
                          return (
                            <form
                              key={`raise-${line.key}`}
                              action={raiseMenuPrice}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-tint px-3 py-2"
                            >
                              <input type="hidden" name="item_id" value={line.itemId} />
                              <input type="hidden" name="by" value={upBy} />
                              <span className="min-w-0 text-sm text-ink/80">
                                <span className="font-semibold">{line.name}</span> cost{" "}
                                {naira(upBy)} more each than the menu says. Put the
                                menu up to {naira(line.unitPrice + upBy)}?
                              </span>
                              <SaveButton quiet>Put it up</SaveButton>
                            </form>
                          );
                        })
                    )}

                    {/* One at a time, because one is what usually changed. */}
                    <form
                      action={setCounterSpend}
                      className="flex flex-wrap items-end gap-2 border-t border-black/10 pt-3"
                    >
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <div className="min-w-0 flex-1">
                        <label className="label" htmlFor="line_key">
                          Which one was different?
                        </label>
                        <select id="line_key" name="line_key" className="field">
                          {counter.map((group) => (
                            <optgroup key={group.restaurant} label={group.restaurant}>
                              {group.lines.map((line) => (
                                <option key={line.key} value={line.key}>
                                  {line.qty}× {line.name}
                                  {line.choices.length > 0 && ` (${line.choices.join(", ")})`}
                                  {" · menu "}
                                  {naira(line.qty * line.unitPrice)}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor="paid">
                          What you paid
                        </label>
                        <input
                          id="paid"
                          name="paid"
                          inputMode="numeric"
                          placeholder="0"
                          className="field w-32"
                        />
                        <input type="hidden" name="recovered" value="" />
                      </div>
                      <SaveButton quiet>Add</SaveButton>
                    </form>

                    <p className="text-xs text-muted">
                      This only moves the profit on this run. Nothing a customer
                      sees changes, and nobody is charged anything different.
                      Clearing a figure puts that line back to the menu price.
                    </p>
                  </section>
                )}

                {counter.map((group, index) => (
                  <section key={group.restaurant} className="card">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-lg font-extrabold">
                        <span className="mr-2 text-muted">Stop {index + 1}</span>
                        {group.restaurant}
                      </h3>
                      <span className="shrink-0 font-bold">
                        {naira(group.expectedFoodTotal)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Checklist
                        id={`counter-${batch.id}-${group.restaurant}`}
                        label="bought"
                        done={shopped}
                        items={group.lines.map((line) => ({
                          key: `${line.name}|${line.choices.join("|")}`,
                          text: `${line.qty}× ${line.name}`,
                          detail:
                            line.choices.length > 0
                              ? line.choices.join(", ")
                              : undefined,
                        }))}
                      />
                    </div>
                  </section>
                ))}
              </>
            ),
          },
          {
            id: "handout",
            label: "Handout",
            badge: String(handout.length),
            content: (
              <>
                <section className="card space-y-2">
                  <h2 className="font-bold">One bag per name</h2>
                  <p className="text-sm text-muted">
                    Anything added later in the week is already merged in. Mark
                    each one delivered as you hand it over: that is the tick,
                    and the customer sees it on their own page. Setting the run
                    itself to &quot;Delivered, every bag&quot; at the top does
                    all of them at once.
                  </p>
                  {handout.length > 0 && finished && (
                    <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm font-semibold text-mint">
                      Every bag on this run is marked delivered.
                    </p>
                  )}
                  {handout.length > 0 && !finished && (
                    <form action={setBagDelivered} className="pb-1">
                      <input
                        type="hidden"
                        name="order_ids"
                        value={handout.flatMap((bag) => bag.orders.map((o) => o.id)).join(",")}
                      />
                      <input type="hidden" name="delivered" value="true" />
                      <ConfirmButton
                        className="px-4 py-2 text-sm"
                        confirm={`Yes, all ${handout.length} handed over`}
                      >
                        Mark every bag delivered
                      </ConfirmButton>
                    </form>
                  )}
                  <HandoutList
                    setDelivered={setBagDelivered}
                    refund={refundOrder}
                    entries={handout.map((bag) => ({
                      id: bag.key,
                      name: bag.name,
                      hostel: bag.hostel,
                      phone: formatPhone(bag.phone),
                      orders: bag.orders.map((order) => ({
                        id: order.id,
                        ref: refFor(order),
                        status: order.status,
                        total: naira(order.total),
                        message: messageFor(order),
                      })),
                      // A bag one person carries for a group still needs each
                      // item labelled, or they cannot hand them out.
                      // The restaurant is part of the item: a Margherita could
                      // have come from Domino's or Panarottis, and at the gate
                      // that is the only thing that tells the bags apart.
                      items: bag.lines.map(
                        (l) =>
                          `${l.qty}× ${l.name}` +
                          (l.choices.length > 0 ? ` (${l.choices.join(", ")})` : "") +
                          ` · ${l.restaurant}` +
                          (l.for_name && l.for_name !== bag.name
                            ? ` · for ${l.for_name}`
                            : "")
                      ),
                    }))}
                  />
                </section>

              </>
            ),
          },
          {
            id: "unpaid",
            label: "Unpaid",
            badge: String(unpaid.length),
            content: (
              <section className="card space-y-3">
                <div>
                  <h2 className="font-bold">These do not travel</h2>
                  <p className="text-sm text-muted">
                    Chase them before the cut-off, or they simply drop out.
                  </p>
                </div>
                {unpaid.length === 0 ? (
                  <p className="text-sm text-muted">None. Everything is paid for.</p>
                ) : (
                  <ul className="space-y-3">
                    {unpaid.map((order) => (
                      <li key={order.id} className="rounded-2xl border border-black/10 p-3">
                        <p className="font-semibold">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="text-muted hover:text-brand"
                          >
                            {refFor(order)}
                          </Link>{" "}
                          {order.for_name ?? order.customer_name} · {naira(order.total)}
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                              order.payment_method === "card"
                                ? "bg-brand text-white"
                                : "bg-black/5 text-muted"
                            }`}
                          >
                            {order.payment_method === "card"
                              ? "wants a card link"
                              : "paying by transfer"}
                          </span>
                          {order.for_name && order.group_id && (
                            <span className="font-normal text-muted">
                              {" "}· one part of {order.customer_name}&apos;s group
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted">
                          {formatPhone(order.customer_phone)} · {order.hostel} ·
                          narration {narration(order)}
                        </p>
                        <p className="mt-1 text-sm">
                          {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="chip border-black/10 bg-white"
                          >
                            View order
                          </Link>
                          <a
                            href={messageFor(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chip border-black/10 bg-white"
                          >
                            Send payment details on WhatsApp
                          </a>
                        </div>
                        <form action={markPaid} className="mt-2 flex gap-2">
                          <input type="hidden" name="order_id" value={order.id} />
                          <input
                            name="payment_ref"
                            placeholder={`Transfer ref (they should send ${narration(order)})`}
                            className="field py-1.5 text-sm"
                          />
                          <ConfirmButton
                            className="shrink-0 px-3 py-1.5 text-sm"
                            confirm={`Yes, ${naira(order.total)} received`}
                          >
                            Mark paid
                          </ConfirmButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ),
          },
          {
            id: "money",
            label: "Profit",
            content: (
              <>
                <section className="card space-y-2">
                  <h2 className="font-bold">Profit on this run</h2>
                  <dl className="space-y-1 text-sm">
                    <Row label="Collected from customers" value={naira(summary.gross)} />
                    {counter.map((group) => (
                      <Row
                        key={group.restaurant}
                        label={`Pay at ${group.restaurant}`}
                        value={`−${naira(group.expectedFoodTotal)}`}
                      />
                    ))}
                    <Row
                      label={
                        summary.commission > 0
                          ? "Promoter commission owed (worked out from the codes)"
                          : "Promoter commission owed"
                      }
                      value={`−${naira(summary.commission)}`}
                    />
                    {summary.reconciled.lines === 0 &&
                      batch.food_spend > 0 &&
                      batch.food_spend < summary.menuCost && (
                        <Row
                          label="Bought under the menu price"
                          value={`+${naira(summary.menuCost - batch.food_spend)}`}
                        />
                      )}
                    {summary.reconciled.lines > 0 && summary.foodCost !== summary.menuCost && (
                      <Row
                        label={
                          summary.foodCost < summary.menuCost
                            ? "Bought under the menu price"
                            : "Cost over the menu price"
                        }
                        value={`${summary.foodCost < summary.menuCost ? "+" : "−"}${naira(
                          Math.abs(summary.menuCost - summary.foodCost)
                        )}`}
                      />
                    )}
                    {batch.fuel_cost > 0 && (
                      <Row label="Fuel" value={`−${naira(batch.fuel_cost)}`} />
                    )}
                    {batch.transport_cost > 0 && (
                      <Row label="Transport" value={`−${naira(batch.transport_cost)}`} />
                    )}
                    {batch.driver_cost > 0 && (
                      <Row label="Driver" value={`−${naira(batch.driver_cost)}`} />
                    )}
                    {batch.other_cost > 0 && (
                      <Row
                        label={batch.cost_note || "Anything else"}
                        value={`−${naira(batch.other_cost)}`}
                      />
                    )}
                  </dl>
                  <p
                    className={`border-t border-black/10 pt-3 text-3xl font-extrabold ${
                      summary.profit >= 0 ? "text-mint" : "text-brand"
                    }`}
                  >
                    {naira(summary.profit)}
                  </p>
                  <p className="text-sm text-muted">
                    {summary.costs === 0
                      ? "Fuel and driver are not in this yet. Put them in below and this becomes the real number."
                      : `After ${naira(summary.costs)} of fuel, driver and anything else.`}
                  </p>
                </section>

                <section className="card space-y-3">
                  <div>
                    <h2 className="font-bold">What this run cost you</h2>
                    <p className="text-sm text-muted">
                      Fill these in on the night. They come straight off the profit
                      above, and off this run in the dashboard. What the food
                      cost is not here: it is priced at the counter, item by
                      item, under At the counter.
                    </p>
                  </div>

                  {/* A run reconciled the old way, with one figure for the
                      whole shop. It still counts, and this is the way out of
                      it and onto the counter prices. */}
                  {batch.food_spend > 0 && summary.reconciled.lines === 0 && (
                    <form
                      action={setRunCosts}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/[0.03] px-3 py-2"
                    >
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <input type="hidden" name="fuel_cost" value={batch.fuel_cost || ""} />
                      <input type="hidden" name="driver_cost" value={batch.driver_cost || ""} />
                      <input
                        type="hidden"
                        name="transport_cost"
                        value={batch.transport_cost || ""}
                      />
                      <input type="hidden" name="other_cost" value={batch.other_cost || ""} />
                      <input type="hidden" name="cost_note" value={batch.cost_note || ""} />
                      <input type="hidden" name="food_spend" value="" />
                      <span className="text-sm">
                        The food on this run was put in as one figure,{" "}
                        <span className="font-bold">{naira(batch.food_spend)}</span>
                        {" "}for the whole shop.
                      </span>
                      <ConfirmButton
                        tone="bare"
                        className="chip border-black/10 bg-white text-brand"
                        confirm="Yes, back to menu prices"
                      >
                        Clear it
                      </ConfirmButton>
                    </form>
                  )}
                  <form action={setRunCosts} className="space-y-3">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="label" htmlFor="fuel_cost">Fuel</label>
                        <input
                          id="fuel_cost"
                          name="fuel_cost"
                          inputMode="numeric"
                          defaultValue={batch.fuel_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="transport_cost">
                          Transport
                        </label>
                        <input
                          id="transport_cost"
                          name="transport_cost"
                          inputMode="numeric"
                          defaultValue={batch.transport_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                        <p className="mt-1 text-xs text-muted">
                          Keke, bike, a car for the bags.
                        </p>
                      </div>
                      <div>
                        <label className="label" htmlFor="driver_cost">Driver</label>
                        <input
                          id="driver_cost"
                          name="driver_cost"
                          inputMode="numeric"
                          defaultValue={batch.driver_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="other_cost">Anything else</label>
                        <input
                          id="other_cost"
                          name="other_cost"
                          inputMode="numeric"
                          defaultValue={batch.other_cost || ""}
                          placeholder="0"
                          className="field"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label" htmlFor="cost_note">
                        What that other money went on
                      </label>
                      <input
                        id="cost_note"
                        name="cost_note"
                        defaultValue={batch.cost_note}
                        placeholder="Bags, gate fee, airtime"
                        className="field"
                      />
                    </div>
                    <SaveButton quiet>Save costs</SaveButton>
                  </form>
                </section>

                <ShortGroups groups={groupsShort} />

                {refunds.length > 0 && (
                  <section className="card space-y-2">
                    <h2 className="font-bold">Refunds owed</h2>
                    <p className="text-sm text-muted">
                      A group shrank when unpaid shares dropped out, so its delivery
                      fee fell a band. Send these back tonight.
                    </p>
                    <ul className="space-y-1 text-sm">
                      {refunds.map((order) => (
                        <li key={order.id} className="flex justify-between gap-3">
                          <span>
                            {order.for_name ?? order.customer_name} ·{" "}
                            {formatPhone(order.customer_phone)}
                          </span>
                          <span className="font-semibold">
                            {naira(order.refund_owed)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ),
          },
          {
            id: "controls",
            label: "Controls",
            content: (
              <>
                <section className="card space-y-3">
                  <div>
                    <h2 className="font-bold">Where the food is</h2>
                    <p className="text-sm text-muted">
                      The same stages as the dropdown at the top of this page.
                      Everyone in this run sees the stage on their order page,
                      and the run closes to new orders by itself the moment you
                      leave &quot;Ordering&quot;.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.filter((stage) => stage !== "ordering").map((stage) => (
                      <form action={setBatchStage} key={stage}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="stage" value={stage} />
                        <ActionButton
                          className={
                            batch.stage === stage
                              ? "btn-primary px-3 py-2 text-sm"
                              : "btn-quiet px-3 py-2 text-sm"
                          }
                          done="Set ✓"
                        >
                          {STAGE_ACTION[stage]}
                        </ActionButton>
                      </form>
                    ))}
                  </div>
                </section>

                <section className="card space-y-3">
                  <form action={updateRun} className="space-y-3">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <div>
                      <h2 className="font-bold">This run</h2>
                      <p className="text-sm text-muted">
                        {empty
                          ? "Nobody has ordered into it yet, so everything about it can still change."
                          : "It has orders on it, so the day and the slot are fixed. The window and the cut-off can still move."}
                      </p>
                    </div>

                    {empty && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label" htmlFor="run_date">Day</label>
                          <input
                            id="run_date"
                            name="run_date"
                            type="date"
                            defaultValue={batch.run_date}
                            className="field"
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="slot">Which run</label>
                          <select
                            id="slot"
                            name="slot"
                            defaultValue={batch.slot}
                            className="field"
                          >
                            <option value="afternoon">Afternoon</option>
                            <option value="night">Night</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="grow">
                        <label className="label" htmlFor="delivery_window_text">
                          What customers are told
                        </label>
                        <input
                          id="delivery_window_text"
                          name="delivery_window_text"
                          defaultValue={batch.delivery_window_text}
                          placeholder="On campus ~2:00pm"
                          className="field"
                        />
                      </div>
                      <div className="w-36">
                        <label className="label" htmlFor="cut_off_time">
                          Orders close
                        </label>
                        <input
                          id="cut_off_time"
                          name="cut_off_time"
                          type="time"
                          defaultValue={clockValue(batch.cut_off_at)}
                          className="field"
                        />
                      </div>
                      <SaveButton quiet className="shrink-0">Save</SaveButton>
                    </div>
                  </form>
                </section>

                <section className="card space-y-3">
                  <form action={setFlashFee} className="space-y-2">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <h2 className="font-bold">Flash fee drop</h2>
                    <p className="text-xs text-muted">
                      For rescuing a thin batch, not rewarding customers. Never
                      announce it in advance, never make it a fixed day, and always
                      give a reason.
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="w-32">
                        <label className="label" htmlFor="flash_fee">Entry fee</label>
                        <input
                          id="flash_fee"
                          name="flash_fee"
                          inputMode="numeric"
                          placeholder="2000"
                          defaultValue={batch.flash_fee ?? ""}
                          className="field"
                        />
                      </div>
                      <div className="grow">
                        <label className="label" htmlFor="flash_fee_reason">
                          Reason shown
                        </label>
                        <input
                          id="flash_fee_reason"
                          name="flash_fee_reason"
                          placeholder="Exam week."
                          defaultValue={batch.flash_fee_reason}
                          className="field"
                        />
                      </div>
                      <SaveButton quiet className="shrink-0">Save</SaveButton>
                    </div>
                    <p className="text-xs text-muted">
                      {batch.flash_fee === null
                        ? `Normal bands: ${bandTable(null, bands).map((b) => `${b.label} ${naira(b.fee)}`).join(", ")}`
                        : `Tonight: ${bandTable(batch.flash_fee, bands).map((b) => `${b.label} ${naira(b.fee)}`).join(", ")}`}
                      . Leave the fee blank to go back to normal pricing.
                    </p>
                  </form>

                  <form action={setBatchCapacity} className="flex items-end gap-2 border-t border-black/5 pt-3">
                    <input type="hidden" name="batch_id" value={batch.id} />
                    <div className="grow">
                      <label className="label" htmlFor="capacity">
                        Capacity (blank = no cap)
                      </label>
                      <input
                        id="capacity"
                        name="capacity"
                        inputMode="numeric"
                        defaultValue={batch.capacity ?? ""}
                        className="field"
                      />
                    </div>
                    <SaveButton quiet className="shrink-0">Save</SaveButton>
                  </form>

                  <div className="border-t border-black/5 pt-3">
                    <h2 className="font-bold">Is this run taking orders?</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      Currently {batch.status}. The stages above set this for you;
                      these two are for overriding it by hand.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="open" />
                        <ActionButton
                          className="btn-quiet px-3 py-2 text-sm"
                          disabled={batch.status === "open"}
                          done="Open ✓"
                        >
                          Reopen for orders
                        </ActionButton>
                      </form>
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="closed" />
                        <ActionButton
                          className="btn-quiet px-3 py-2 text-sm"
                          disabled={batch.status === "closed"}
                          done="Closed ✓"
                        >
                          Close early
                        </ActionButton>
                      </form>
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <ConfirmButton
                          tone="brand"
                          className="px-3 py-2 text-sm"
                          confirm="Yes, cancel the run"
                        >
                          Cancel this run
                        </ConfirmButton>
                      </form>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Cancelling a run does not refund anyone. Refund each order on
                      the handout tab, same night, in full.
                    </p>

                    {empty && (
                      <form action={deleteRun} className="mt-4 border-t border-black/5 pt-3">
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <h3 className="font-bold">Delete this run</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          Nothing has been ordered into it, so it can go
                          entirely. A run with orders on it is cancelled
                          instead, never deleted.
                        </p>
                        <span className="mt-2 block">
                          <ConfirmButton
                            tone="brand"
                            className="px-4 py-2 text-sm"
                            confirm="Yes, delete it"
                          >
                            Delete this run
                          </ConfirmButton>
                        </span>
                      </form>
                    )}
                  </div>
                </section>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}

/** A timestamp as an <input type="time"> wants it, in Lagos time. */
function clockValue(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "font-semibold" : ""}`}>
      <dt className="text-ink/75">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
