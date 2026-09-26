import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import OrderCard from "@/components/admin/OrderCard";
import { orderFeed } from "@/lib/admin-data";
import { getOrder } from "@/lib/orders";
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

  // The card wants the feed's shape, so this one order is read the same way.
  const card = (await orderFeed({ status: "all", search: order.customer_phone })).find(
    (row) => row.id === order.id
  );

  return (
    <div>
      <PageHeader
        // The same wording as the card below it and the transfer narration:
        // #1001a, not #1001 on one screen and #1001a on the next.
        title={`Order ${shareRef(order, order.shares.length > 0 ? order.shares : [order])}`}
        // Two people on a gift, and the driver needs the second one. Whoever
        // paid stays first, because they are who is chased for money.
        detail={
          order.deliver_to_name
            ? `Paid by ${order.customer_name} · ${formatPhone(order.customer_phone)} — ` +
              `goes to ${order.deliver_to_name} · ${formatPhone(
                order.deliver_to_phone ?? ""
              )} · ${order.hostel}`
            : `${order.customer_name} · ${formatPhone(order.customer_phone)} · ${order.hostel}`
        }
        backHref="/admin/orders"
        backLabel="All orders"
        actions={
          <Link
            href={`/admin/batch/${order.batch_id}`}
            className="btn-quiet px-4 py-2.5 text-sm"
          >
            Open its run
          </Link>
        }
      />

      <div
        className={`mb-4 grid grid-cols-2 gap-3 ${
          order.discount > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"
        }`}
      >
        <Stat label="Total" value={order.total} money />
        <Stat label="Food" value={order.subtotal_food} money />
        <Stat label="Delivery" value={order.fee} money />
        {/* Only when there is one, so an ordinary order is not four fifths
            zeroes. The code is the hint, because the amount alone does not say
            which offer it came from. */}
        {order.discount > 0 && (
          <Stat
            label="Discount"
            value={`−${naira(order.discount)}`}
            hint={order.coupon_code ?? "No code, taken off by hand"}
          />
        )}
        <Stat
          label="Status"
          value={order.status === "pending" ? "Unpaid" : order.status}
          tone={order.status === "pending" ? "warn" : "good"}
        />
      </div>

      {/* Not on a parcel: there are no lines in it to change. */}
      {!order.parcel_route && (
        <OrderEditor
          orderId={order.id}
          lines={editable}
          catalogue={catalogue}
          pending={Boolean((order as { custom_pending?: boolean }).custom_pending)}
          charged={
            (order as { charged?: number | null }).charged ?? null
          }
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

      {card && (
        <OrderCard
          onList={false}
          order={toCard(card, settings, url, bank)}
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
        <section className="card mt-4 space-y-3">
          <div>
            <h2 className="font-bold">The day it goes</h2>
            <p className="text-sm text-muted">
              {boxDay
                ? `They asked for ${dayWord(boxDay)}.`
                : "They said any day is fine. Agree one and their page will say it."}
              {repeatEvery
                ? ` ${repeatSaid(repeatEvery)}${repeatNote ? `, ${repeatNote}` : ""}.`
                : ""}
            </p>
          </div>

          <form action={setBoxDay} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="order_id" value={order.id} />
            <label className="text-xs font-semibold text-muted">
              Going on
              <input
                type="date"
                name="run_date"
                defaultValue={boxDay || order.batch.run_date}
                className="field mt-0.5 w-44 py-1.5 text-sm"
              />
            </label>
            <button className="btn-quiet px-4 py-2 text-sm">Set the day</button>
          </form>

          {/* Not only the ones that repeat. Somebody rings up wanting the
              same care package as last month, and remaking it by hand is
              twenty lines to get wrong. */}
          <form
            action={orderAgain}
            className="flex flex-wrap items-end gap-2 border-t border-black/5 pt-3"
          >
            <input type="hidden" name="order_id" value={order.id} />
            <label className="text-xs font-semibold text-muted">
              {repeatEvery !== "" ? "Next one going on" : "Same again, going on"}
              <input
                type="date"
                name="run_date"
                className="field mt-0.5 w-44 py-1.5 text-sm"
              />
            </label>
            <button className="btn-primary px-4 py-2 text-sm">
              {repeatEvery !== "" ? "Raise the next one" : "Order this again"}
            </button>
            <span className="text-xs text-muted">
              Copies what is in it now, unpaid, ready to send.
            </span>
          </form>
        </section>
      )}

      {/* Only on a parcel. Nobody photographs a bag of jollof, and a button
          offered on every order is a button nobody presses on the one that
          needs it. */}
      {/* A parcel has no run page to move it on from, because it is not a
          run. Where it has got to is set here, which is the only page it
          has. */}
      {order.parcel_route && (
        <section className="card mt-4 space-y-2">
          <div>
            <h2 className="font-bold">Where it has got to</h2>
            <p className="text-sm text-muted">
              What the sender sees on their own page, and what the driver has
              done so far.
            </p>
          </div>
          <StagePicker
            batchId={order.batch.id}
            stage={order.batch.stage}
            action={setBatchStage}
            parcel
          />
        </section>
      )}

      {order.parcel_route && (
        <div className="mt-4">
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
        </div>
      )}

      {order.parcel_route && (
        <div className="mt-4">
          <ParcelPhotos
            orderId={order.id}
            photos={await photosFor(order.id)}
            add={addParcelPhoto}
            remove={removeParcelPhoto}
          />
        </div>
      )}

      {/* Somebody paid after the cut off, so the car they were on has gone
          shopping without them. Moving them is a decision about a person, and
          telling them is a message written by hand, so both live here rather
          than in a rule that runs at night. */}
      <section className="card mt-4 space-y-2">
        <h2 className="font-bold">Move it to another run</h2>
        <p className="text-sm text-muted">
          On {order.batch.delivery_window_text.toLowerCase()},{" "}
          {dayWord(order.batch.run_date)}. A paid order carries its money
          across: nothing is charged again and nothing is refunded. A run that
          has already closed is here too, because moving an order by hand is
          usually about a car that has gone.
        </p>
        {said !== "" && (
          <div className="space-y-2 rounded-xl bg-shell px-3 py-2">
            <p className="text-sm font-semibold">{said}</p>
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
                className="chip border-black/10 bg-white text-brand"
              >
                Tell them on WhatsApp
              </a>
            )}
          </div>
        )}
        <form action={moveOrderToAnother} className="flex flex-wrap gap-2">
          <input type="hidden" name="order_id" value={order.id} />
          <select name="going" className="field grow" defaultValue="">
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
            {runs.map(toBatchView).some((one) => one.closed && one.id !== order.batch_id) && (
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
          <button type="submit" className="btn-quiet px-4 py-2.5 text-sm">
            Move it
          </button>
        </form>
      </section>

      {order.shares.length > 1 && (
        <section className="card mt-4 space-y-2">
          <h2 className="font-bold">The rest of this group</h2>
          <ul className="space-y-2 text-sm">
            {order.shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3">
                <span>
                  {share.for_name ?? share.customer_name}
                  <span className="text-muted"> · {formatPhone(share.customer_phone)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-semibold">{naira(share.total)}</span>
                  {share.id === order.id ? (
                    <span className="text-xs text-muted">this one</span>
                  ) : (
                    <Link
                      href={`/admin/orders/${share.id}`}
                      className="text-xs font-semibold text-brand"
                    >
                      Open
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
