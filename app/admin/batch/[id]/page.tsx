import SaveButton from "@/components/SaveButton";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import HandoutList from "@/components/HandoutList";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import Tabs from "@/components/admin/Tabs";
import { batchSheet } from "@/lib/admin";
import { SLOT_LABEL } from "@/lib/config";
import Link from "next/link";
import { naira, orderRef } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { clockLabel, runDateLabel } from "@/lib/time";
import { bandTable, parseBands } from "@/lib/fees";
import { template, whatsappTo } from "@/lib/messages";
import { getSettings } from "@/lib/settings";
import { sheetAsText } from "@/lib/sheet-text";
import { STAGES, STAGE_ACTION } from "@/lib/stages";
import {
  markDelivered,
  markPaid,
  refundOrder,
  setBatchCapacity,
  setBatchStage,
  setBatchStatus,
  setFlashFee,
  setRunCosts,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sheet = await batchSheet((await params).id);
  if (!sheet) notFound();

  const { batch, counter, handout, unpaid, summary, refunds, pins } = sheet;
  const belowMinimum = summary.paidCount < summary.minimum;

  const settings = await getSettings();
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
      })
    );

  return (
    <div>
      <PageHeader
        title={batchLabel}
        detail={`Closes ${clockLabel(batch.cut_off_at)} · ${batch.delivery_window_text} · ${batch.status}`}
        backHref="/admin/runs"
        backLabel="All runs"
        actions={
          <a
            href={whatsappTo(
              settings.whatsapp_number || "0",
              sheetAsText(sheet, batchLabel)
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-quiet px-4 py-2.5 text-sm"
          >
            Send sheet to my WhatsApp
          </a>
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
                <section className="card">
                  <h2 className="font-bold">What you pay, stop by stop</h2>
                  <p className="text-sm text-muted">
                    Paid orders only. This is the money that leaves your hand at
                    each restaurant.
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
                    <ul className="mt-2 space-y-1 text-lg leading-snug">
                      {group.lines.map((line) => (
                        <li key={`${line.name}|${line.choices.join("|")}`}>
                          <span className="font-black">{line.qty}×</span> {line.name}
                          {line.choices.length > 0 && (
                            <span className="text-muted"> · {line.choices.join(", ")}</span>
                          )}
                        </li>
                      ))}
                    </ul>
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
                    Anything added later in the week is already merged in. Tick
                    each name as you hand it over.
                  </p>
                  <HandoutList
                    batchId={batch.id}
                    entries={handout.map((bag) => ({
                      id: bag.key,
                      name: bag.name,
                      hostel: bag.hostel,
                      phone: formatPhone(bag.phone),
                      orders: bag.orders.map((order) => ({
                        id: order.id,
                        ref: orderRef(order),
                      })),
                      // A bag one person carries for a group still needs each
                      // item labelled, or they cannot hand them out.
                      items: bag.lines.map(
                        (l) =>
                          `${l.qty}× ${l.name}` +
                          (l.choices.length > 0 ? ` (${l.choices.join(", ")})` : "") +
                          (l.for_name && l.for_name !== bag.name ? ` · for ${l.for_name}` : "")
                      ),
                    }))}
                  />
                </section>

                {handout.length > 0 && (
                  <section className="card space-y-2">
                    <h2 className="font-bold">Message, deliver, refund</h2>
                    <ul className="space-y-2">
                      {handout.flatMap((bag) =>
                        bag.orders.map((order) => (
                          <li
                            key={order.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-2.5 text-sm"
                          >
                            <span className="font-semibold">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="hover:text-brand"
                              >
                                <span className="text-muted">{orderRef(order)}</span>{" "}
                                {bag.name}
                              </Link>
                              <span className="font-normal text-muted">
                                {" "}· {order.status} · {naira(order.total)}
                              </span>
                            </span>
                            <span className="flex flex-wrap gap-2">
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
                                Confirm on WhatsApp
                              </a>
                              <form action={markDelivered}>
                                <input type="hidden" name="order_id" value={order.id} />
                                <button className="chip border-black/10 bg-white">
                                  Delivered
                                </button>
                              </form>
                              <form action={refundOrder}>
                                <input type="hidden" name="order_id" value={order.id} />
                                <button className="chip border-black/10 bg-white text-brand">
                                  Refund
                                </button>
                              </form>
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                )}
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
                            {orderRef(order)}
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
                          {order.for_name && (
                            <span className="font-normal text-muted">
                              {" "}· share of {order.customer_name}&apos;s group
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted">
                          {formatPhone(order.customer_phone)} · {order.hostel}
                        </p>
                        <p className="mt-1 text-sm">
                          {order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                        </p>
                        <a
                          href={messageFor(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-quiet mt-2 w-full text-sm"
                        >
                          Send payment details on WhatsApp
                        </a>
                        <form action={markPaid} className="mt-2 flex gap-2">
                          <input type="hidden" name="order_id" value={order.id} />
                          <input
                            name="payment_ref"
                            placeholder="Transfer ref (optional)"
                            className="field py-1.5 text-sm"
                          />
                          <button className="btn-primary shrink-0 px-3 py-1.5 text-sm">
                            Mark paid
                          </button>
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
                      label="Promoter commission owed"
                      value={`−${naira(summary.commission)}`}
                    />
                    {batch.fuel_cost > 0 && (
                      <Row label="Fuel" value={`−${naira(batch.fuel_cost)}`} />
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
                      above, and off this run in the dashboard.
                    </p>
                  </div>
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
                      Tap a stage as you reach it. Everyone in this batch sees it on
                      their order page, and the run closes to new orders by itself
                      the moment you leave &quot;Ordering&quot;.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STAGES.filter((stage) => stage !== "ordering").map((stage) => (
                      <form action={setBatchStage} key={stage}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="stage" value={stage} />
                        <button
                          className={
                            batch.stage === stage
                              ? "btn-primary px-3 py-2 text-sm"
                              : "btn-quiet px-3 py-2 text-sm"
                          }
                        >
                          {STAGE_ACTION[stage]}
                        </button>
                      </form>
                    ))}
                  </div>
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
                        <button
                          className="btn-quiet px-3 py-2 text-sm"
                          disabled={batch.status === "open"}
                        >
                          Reopen for orders
                        </button>
                      </form>
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="closed" />
                        <button
                          className="btn-quiet px-3 py-2 text-sm"
                          disabled={batch.status === "closed"}
                        >
                          Close early
                        </button>
                      </form>
                      <form action={setBatchStatus}>
                        <input type="hidden" name="batch_id" value={batch.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <button
                          className="btn-quiet px-3 py-2 text-sm text-brand"
                          disabled={batch.status === "cancelled"}
                        >
                          Cancel this run
                        </button>
                      </form>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Cancelling a run does not refund anyone. Refund each order on
                      the handout tab, same night, in full.
                    </p>
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
