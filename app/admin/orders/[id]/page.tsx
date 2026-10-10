import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import Stat from "@/components/admin/Stat";
import { howPaid, orderStory } from "@/lib/order-story";
import OrderCard from "@/components/admin/OrderCard";
import { orderFeed } from "@/lib/admin-data";
import { getOrder } from "@/lib/orders";
import { getBatch } from "@/lib/batches";
import { SLOT_LABEL } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";
import { siteUrl, toCard } from "@/lib/admin-templates";
import ParcelPhotos from "@/components/admin/ParcelPhotos";
import ParcelDay from "@/components/admin/ParcelDay";
import StagePicker from "@/components/admin/StagePicker";
import { photosFor } from "@/lib/parcel-photos";
import { tripGoingOn } from "@/lib/parcel-jobs";
import { naira, shareRef } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { whatsappTo } from "@/lib/messages";
import {
  addParcelPhoto,
  setBatchStage,
  agreeParcelDay,
  markPaid,
  markDelivered,
  moveOrderToAnother,
  cancelOrder,
  deleteOrder,
  refundOrder,
  savePaymentLink,
  removeParcelPhoto,
  saveOrderNote,
  setBoxDay,
  orderAgain,
  setLineQty,
  swapOrderLine,
  addOrderLine,
  addLineOption,
  removeLineOption,
  settleCustom,
} from "../../actions";
import OrderEditor from "@/components/admin/OrderEditor";
import { linesToEdit } from "@/lib/order-edit";
import { repeatSaid } from "@/lib/box-day";
import { foodCatalogue } from "@/lib/box-admin";
import { openBatches } from "@/lib/batches";
import { hoursByDay } from "@/lib/settings";
import { deliverySlots } from "@/lib/same-day";
import { toBatchView } from "@/lib/view";
import { dayWord, lagosClock, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** What the last move said, good or bad. It travels in the address so the
   *  page can be a server page and still report what happened. */
  searchParams: Promise<{ moved?: string }>;
}) {
  const { id } = await params;
  const said = (await searchParams).moved ?? "";

  // Production hides why a server render failed and shows a React number
  // instead, which names nothing and cannot be searched for. Admin is behind a
  // password, so the page says what actually went wrong to the one person who
  // can do something about it.
  try {
    return await orderPage(id, said);
  } catch (error) {
    // notFound() and redirect() travel as errors and must not be caught.
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw error;

    const detail = error instanceof Error ? error : new Error(String(error));
    return (
      <div className="card space-y-2 border-red-200 bg-red-50">
        <h1 className="font-extrabold text-red-800">This order would not open</h1>
        <p className="break-words text-sm text-red-900">{detail.message}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/70 p-3 text-xs text-red-900">
          {(detail.stack ?? "").split("\n").slice(0, 6).join("\n")}
        </pre>
        <Link href="/admin/orders" className="btn-quiet w-fit px-4 py-2 text-sm">
          Back to orders
        </Link>
      </div>
    );
  }
}

async function orderPage(id: string, said: string) {

  const [order, settings, url, runs, editable, shops] = await Promise.all([
    getOrder(id),
    getSettings(),
    siteUrl(),
    openBatches(),
    // What is actually in it, so it can be changed to whatever was agreed.
    linesToEdit(id),
    // Everything sellable, ours and the restaurants', for adding a line.
    foodCatalogue().catch(() => []),
  ]);

  const boxDay = String((order as { wanted_on?: string | null }).wanted_on ?? "");
  const repeatEvery = String((order as { repeat_every?: string }).repeat_every ?? "");
  const repeatNote = String((order as { repeat_note?: string }).repeat_note ?? "");

  const catalogue = shops.flatMap((shop) =>
    shop.items.map((item) => ({
      id: item.id,
      name: item.name,
      shop: shop.name,
      price: item.price,
      // The choices this item really has, so changing hand tossed to thin
      // crust is picking the one that exists rather than typing it again.
      options: item.groups.flatMap((group) =>
        group.options.map((one) => ({
          name: `${group.name}: ${one.name}`,
          delta: one.delta,
        }))
      ),
    }))
  );

  // Where this one could go instead, soonest first: a run still taking
  // orders, or a window of its own, which makes its car when it is picked.
  const slots =
    settings.same_day_on === "on"
      ? deliverySlots(new Date(), await hoursByDay())
      : [];
  // The account every payment message quotes: the first on the list.
  const bank = (await payableAccounts(settings))[0] ?? null;
  if (!order) notFound();

  // Which run it is on, said rather than left behind a button. "Open its
  // run" told you there was one and nothing about which: knowing an order is
  // on Friday night is most of what anybody opens this page to find out.
  const run = await getBatch(order.batch_id);
  const runLabel = run
    ? run.kind === "same_day"
      ? `A car of its own · ${runDateLabel(run.run_date)}`
      : `${runDateLabel(run.run_date)} · ${SLOT_LABEL[run.slot]}`
    : "";

  // The restaurants this order is bought at, which both the figure row and
  // the story below are written from.
  const counters = [...new Set(order.lines.map((line) => line.restaurant))];

  // The card wants the feed's shape, so this one order is read the same way.
  const card = (await orderFeed({ status: "all", search: order.customer_phone })).find(
    (row) => row.id === order.id
  );
  // Worked out once, because the header borrows two of the card's message
  // templates: the board opens an order with their PIN and the review ask,
  // and the card below then does not offer the same two links again.
  const shown = card ? toCard(card, settings, url, bank) : null;
  const pin = shown?.templates.find((one) => one.kind === "pin") ?? null;
  const review = shown?.templates.find((one) => one.kind === "review") ?? null;

  return (
    <div>
      <PageHeader
        backHref="/admin/orders"
        backLabel="All orders"
        /* The same wording as the card below it and the transfer
           narration: #1001a, not #1001 on one screen and #1001a on the
           next. */
        title={`Order ${shareRef(
          order,
          order.shares.length > 0 ? order.shares : [order]
        )}`}
        /* Two people on a gift, and the driver needs the second one.
           Whoever paid stays first, because they are who is chased. */
        detail={
          <>
            {order.deliver_to_name
              ? `Paid by ${order.customer_name} · ${formatPhone(order.customer_phone)}, ` +
                `goes to ${order.deliver_to_name} · ${formatPhone(
                  order.deliver_to_phone ?? ""
                )} · ${order.hostel}`
              : `${order.customer_name} · ${formatPhone(order.customer_phone)} · ${order.hostel}`}
            {runLabel === "" ? "" : ` · on ${runLabel}`}
          </>
        }
        /* What the board puts at the top of an order: the run it is on,
           their PIN, and the one thing to do next. The two messages are
           not offered again on the card below, because the same WhatsApp
           link handed over twice is a message sent twice. */
        actions={
          <>
            <Link href={`/admin/batch/${order.batch_id}`} className="btn-admin">
              {runLabel === "" ? "Open its run" : `On ${runLabel}`}
            </Link>
            {pin && (
              <a
                href={pin.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin"
              >
                {pin.label}
              </a>
            )}
            {review && (
              <a
                href={review.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-admin-go"
              >
                {review.label}
              </a>
            )}
          </>
        }
      />

      <div
        className={`mb-[18px] grid gap-3.5 sm:grid-cols-2 ${
          order.discount > 0 ? "xl:grid-cols-5" : "xl:grid-cols-4"
        }`}
      >
        <Figure label="Total" value={naira(order.total)} />
        {/* Who the food money is going to, and where the car is going,
            which is what the board writes under these two. A figure with
            nothing under it is a number nobody can act on. */}
        <Figure
          label="Food"
          value={naira(order.subtotal_food)}
          detail={
            counters.length === 0 ? "" : `Paid to ${counters.join(" · ")}`
          }
        />
        <Figure label="Delivery" value={naira(order.fee)} detail={runLabel} />
        {/* Only when there is one, so an ordinary order is not four fifths
            zeroes. The code is the hint, because the amount alone does not
            say which offer it came from. */}
        {order.discount > 0 && (
          <Figure
            label="Discount"
            value={`−${naira(order.discount)}`}
            detail={order.coupon_code ?? "No code, taken off by hand"}
          />
        )}
        <Figure
          label="Status"
          value={order.status === "pending" ? "Unpaid" : order.status}
          tone={order.status === "pending" ? "ink" : "mint"}
        />
      </div>

      {/* Two columns, as the board draws it: what the order is and what can
          be done to it on the left, and the things you only read on the
          right. One stacked column put the story of the order below four
          cards of controls, where nobody scrolled to it. */}
      <div className="grid items-start gap-[18px] xl:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Not on a parcel: there are no lines in it to change. */}
          {!order.parcel_route && (
            <OrderEditor
              orderId={order.id}
              lines={editable}
              catalogue={catalogue}
              pending={Boolean((order as { custom_pending?: boolean }).custom_pending)}
              charged={(order as { charged?: number | null }).charged ?? null}
              total={order.total}
              note={order.customer_note ?? ""}
              status={order.status}
              setQty={setLineQty}
              swapLine={swapOrderLine}
              addLine={addOrderLine}
              addOption={addLineOption}
              removeOption={removeLineOption}
              settle={settleCustom}
            />
          )}

          {shown && (
            <OrderCard
              onList={false}
              order={shown}
              without={["pin", "review"]}
              markPaid={markPaid}
              markDelivered={markDelivered}
              refund={refundOrder}
              cancel={cancelOrder}
              remove={deleteOrder}
              savePaymentLink={savePaymentLink}
              saveNote={saveOrderNote}
            />
          )}

          {/* A collection on a day of its own. Two things the shop has to be
              able to do by hand: agree the day, and raise the next one. */}
          {order.batch.kind === "box" && (
            <Panel
              title="The day it goes"
              detail={
                <>
                  {boxDay
                    ? `They asked for ${dayWord(boxDay)}.`
                    : "They said any day is fine. Agree one and their page will say it."}
                  {repeatEvery
                    ? ` ${repeatSaid(repeatEvery)}${repeatNote ? `, ${repeatNote}` : ""}.`
                    : ""}
                </>
              }
            >
              <form action={setBoxDay} className="flex flex-wrap items-end gap-2.5">
                <input type="hidden" name="order_id" value={order.id} />
                <label className="flex flex-col gap-[5px] text-[13px] font-semibold">
                  Going on
                  <input
                    type="date"
                    name="run_date"
                    defaultValue={boxDay || order.batch.run_date}
                    className="field min-h-[42px] w-44 py-0 text-[14.5px]"
                  />
                </label>
                <button className="btn-admin">Set the day</button>
              </form>

              {/* Not only the ones that repeat. Somebody rings up wanting the
                  same care package as last month, and remaking it by hand is
                  twenty lines to get wrong. */}
              <form
                action={orderAgain}
                className="mt-3.5 flex flex-wrap items-end gap-2.5 border-t-[1.5px] border-rule pt-3.5"
              >
                <input type="hidden" name="order_id" value={order.id} />
                <label className="flex flex-col gap-[5px] text-[13px] font-semibold">
                  {repeatEvery !== "" ? "Next one going on" : "Same again, going on"}
                  <input
                    type="date"
                    name="run_date"
                    className="field min-h-[42px] w-44 py-0 text-[14.5px]"
                  />
                </label>
                <button className="btn-admin">
                  {repeatEvery !== "" ? "Raise the next one" : "Order this again"}
                </button>
                <span className="hint">
                  Copies what is in it now, unpaid, ready to send.
                </span>
              </form>
            </Panel>
          )}

          {/* Only on a parcel. Nobody photographs a bag of jollof, and a
              button offered on every order is a button nobody presses on the
              one that needs it. */}
          {/* A parcel has no run page to move it on from, because it is not a
              run. Where it has got to is set here, which is the only page it
              has. */}
          {order.parcel_route && (
            <Panel
              title="Where it has got to"
              detail="What the sender sees on their own page, and what the driver has done so far."
            >
              <StagePicker
                batchId={order.batch.id}
                stage={order.batch.stage}
                action={setBatchStage}
                parcel
              />
            </Panel>
          )}

          {order.parcel_route && (
            <ParcelDay
              orderId={order.id}
              wantedOn={order.parcel_wanted_on ?? ""}
              runDate={order.batch.run_date}
              cutOffTime={lagosClock(order.batch.cut_off_at)}
              agreed={Boolean(order.batch.deliver_at)}
              joining={await (async () => {
                // Said as a day somebody reads, not as 2026-09-26.
                const day = await tripGoingOn(order.parcel_route!, order.batch.id);
                return day === "" ? "" : runDateLabel(day);
              })()}
              action={agreeParcelDay}
            />
          )}

          {order.parcel_route && (
            <ParcelPhotos
              orderId={order.id}
              photos={await photosFor(order.id)}
              add={addParcelPhoto}
              remove={removeParcelPhoto}
            />
          )}

          {/* Somebody paid after the cut off, so the car they were on has
              gone shopping without them. Moving them is a decision about a
              person, and telling them is a message written by hand, so both
              live here rather than in a rule that runs at night. */}
          <Panel
            title="Move it to another run"
            detail={
              <>
                On {order.batch.delivery_window_text.toLowerCase()},{" "}
                {dayWord(order.batch.run_date)}. A paid order carries its money
                across: nothing is charged again and nothing is refunded. A run
                that has already closed is here too, because moving an order by
                hand is usually about a car that has gone.
              </>
            }
          >
            {said !== "" && (
              <div className="soft mb-2.5 space-y-2 p-3.5">
                <p className="text-[14.5px] font-semibold">{said}</p>
                {/* Click to send, never sent for them. Somebody whose run was
                    changed under them is owed a message from a person, and the
                    wording here is only a head start on writing it. */}
                {said.startsWith("Moved") && (
                  <a
                    href={whatsappTo(
                      order.customer_phone,
                      `Hi ${order.customer_name}, your order ${shareRef(
                        order,
                        order.shares.length > 0 ? order.shares : [order]
                      )} could not make the run it was on, so I have moved it to the next one: ` +
                        `${order.batch.delivery_window_text.toLowerCase()}, ${dayWord(
                          order.batch.run_date
                        )}. There is nothing extra to pay.\n\nYour order: ${url}/o/${order.id}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-admin btn-admin-sm"
                  >
                    Tell them on WhatsApp
                  </a>
                )}
              </div>
            )}
            <form action={moveOrderToAnother} className="flex flex-wrap gap-2.5">
              <input type="hidden" name="order_id" value={order.id} />
              <select
                name="going"
                className="field min-h-[42px] grow basis-60 py-0 text-[14.5px]"
                defaultValue=""
              >
                <option value="" disabled>
                  Where it goes now
                </option>
                {runs
                  .map(toBatchView)
                  .filter((one) => !one.closed && !one.full && one.id !== order.batch_id)
                  .map((one) => (
                    <option key={one.id} value={`run:${one.id}`}>
                      {one.deliveryWindow}, {one.label.split(" · ")[0]}
                    </option>
                  ))}

                {/* Closed ones too, because moving an order by hand is usually
                    about a car that has already gone. A customer cannot pick
                    these; the person who bought the food can. */}
                {runs
                  .map(toBatchView)
                  .some((one) => one.closed && one.id !== order.batch_id) && (
                  <optgroup label="Already closed">
                    {runs
                      .map(toBatchView)
                      .filter((one) => one.closed && one.id !== order.batch_id)
                      .map((one) => (
                        <option key={one.id} value={`run:${one.id}`}>
                          {one.deliveryWindow}, {one.label.split(" · ")[0]}
                        </option>
                      ))}
                  </optgroup>
                )}
                {slots.length > 0 && (
                  <optgroup label="A car of its own">
                    {slots.map((slot) => (
                      <option key={slot.at} value={slot.at}>
                        {slot.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button type="submit" className="btn-admin">
                Move it
              </button>
            </form>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* How it went, which the page could never say before: it could
              tell you what an order is and never what had happened to it. */}
          <Panel title="How it went">
            <ol className="mt-3">
              {orderStory(
                {
                  created_at: order.created_at,
                  paid_at: order.paid_at,
                  done_at: order.done_at,
                  rated_at: order.rated_at,
                  status: order.status,
                  payment_method: order.payment_method,
                  paid_into: (order as { paid_into?: string }).paid_into ?? "",
                  hostel: order.hostel,
                  batchStage: order.batch?.stage ?? "",
                  counters,
                },
                (iso) => lagosClock(iso)
              ).map((step, at, all) => (
                <li key={step.label} className="flex gap-3">
                  <span className="flex flex-none flex-col items-center">
                    <span
                      className={`size-3.5 rounded-full border-2 border-ink ${
                        step.done ? "bg-mint" : "border-line bg-line"
                      }`}
                    />
                    {at < all.length - 1 && (
                      <span className="min-h-[26px] w-0.5 flex-1 bg-line" />
                    )}
                  </span>
                  <span className="pb-3.5">
                    <span className="block text-[14.5px] font-semibold">{step.label}</span>
                    <span className="hint block">
                      {step.label === "Paid" && step.done
                        ? `${step.when} · ${howPaid(order)}`
                        : step.when || (step.done ? "Done" : "Not yet")}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* Who this is, and one way through to everything else they have
              ever ordered. The board ends the right column with it, and the
              page used to have no way out to the person at all. */}
          <Panel title={order.deliver_to_name ?? order.customer_name}>
            <dl className="mt-3 text-[14.5px]">
              <Detail label="Rings on" value={formatPhone(order.customer_phone)} />
              {order.deliver_to_name && (
                <Detail
                  label="Paid by"
                  value={`${order.customer_name} · ${formatPhone(order.customer_phone)}`}
                />
              )}
              <Detail label="Block" value={order.hostel} />
              <Detail
                label="Left a review"
                value={order.rated_at ? "Yes" : "Not yet"}
              />
            </dl>
            <Link
              href={`/admin/customers/${encodeURIComponent(order.customer_phone)}`}
              className="btn-admin btn-admin-sm mt-3 w-full"
            >
              Open customer →
            </Link>
          </Panel>

          {order.shares.length > 1 && (
            <Panel title="The rest of this group">
              <ul className="mt-3 text-[14.5px]">
                {order.shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between gap-3 border-t-[1.5px] border-rule py-2.5 first:border-t-0 first:pt-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {share.for_name ?? share.customer_name}
                      </span>
                      <span className="hint block">
                        {formatPhone(share.customer_phone)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <span className="font-mono font-semibold">{naira(share.total)}</span>
                      {share.id === order.id ? (
                        <span className="hint">this one</span>
                      ) : (
                        <Link
                          href={`/admin/orders/${share.id}`}
                          className="btn-admin btn-admin-sm"
                        >
                          Open
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/** One line of the person's card: the board's `.k` label on the left, what
 *  it says on the right, with the hairline rule between rows. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t-[1.5px] border-rule py-2 first:border-t-0 first:pt-0">
      <dt className="ticket shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-semibold">{value}</dd>
    </div>
  );
}
