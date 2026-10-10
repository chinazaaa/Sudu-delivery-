import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import { howPaid, orderStory } from "@/lib/order-story";
import { StatusPill } from "@/components/admin/OrderCard";
import { orderFeed } from "@/lib/admin-data";
import { oneCustomer, shareOfProfit } from "@/lib/customer";
import { getOrder } from "@/lib/orders";
import { getBatch } from "@/lib/batches";
import { SLOT_LABEL, TZ } from "@/lib/config";
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
  moveOrderToAnother,
  removeParcelPhoto,
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
      /* In the palette's own red and on the admin's own button, rather than
         Tailwind's default red ramp and the shop's fifty-two pixel one:
         this is still an admin page, and a page that goes wrong is where
         looking like somewhere else is least welcome. */
      <div className="card space-y-2 border-brand-dark bg-brand-wash">
        <h1 className="font-extrabold text-brand-dark">This order would not open</h1>
        <p className="break-words text-sm text-brand-dark">{detail.message}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-paper p-3 text-xs text-brand-dark">
          {(detail.stack ?? "").split("\n").slice(0, 6).join("\n")}
        </pre>
        <Link href="/admin/orders" className="btn-admin w-fit">
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

  /*
   * What this order left, after its food, the commission on it and its share
   * of the car.
   *
   * The fourth tile used to be the status, which the chip beside the total
   * already says and which set a word in the display face at forty pixels:
   * the rule is that money is mono and the display face is never a word. The
   * split is the one the customer page uses, narrowed to this one order, so
   * the two pages cannot print different profits for the same food.
   */
  const earned = card
    ? await shareOfProfit([card], card.subtotal_food ?? 0, card.total).catch(() => null)
    : null;

  // Who they are, for the two rows the board's person panel has that ours
  // never had: how many orders they have placed and what they have spent.
  const them = await oneCustomer(order.customer_phone).catch(() => null);

  return (
    /* Room under the last card for the bar standing over it on a phone. */
    <div className="pb-[76px] lg:pb-0">
      {/* The phone board heads an order with the person rather than with the
          word Order: whoever is holding this already knows what they tapped,
          and the name is what the next sentence out loud starts with. Its
          own markup because PageHeader takes its title as a string and so
          cannot say one thing on a phone and another on a desk; a responsive
          title belongs in that component, and this is the note asking for
          it. */}
      <div className="mb-3 lg:hidden">
        <Link
          href="/admin/orders"
          className="text-[12px] font-semibold text-muted hover:text-brand"
        >
          ← All orders
        </Link>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="font-display text-[33px] font-black uppercase leading-none">
            {order.deliver_to_name ?? order.customer_name}
          </h1>
          <span className="font-mono text-[13px] text-muted">
            {shareRef(order, order.shares.length > 0 ? order.shares : [order])}
          </span>
        </div>
        <p className="hint mt-1">
          {[order.hostel, runLabel].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="hidden lg:block">
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
              {/* These two stand in the bar at the bottom on a phone, which is
                  where the board puts them and where the thumb is. Here from
                  `lg`, where the mouse is already in the header. */}
              {pin && (
                <a
                  href={pin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-admin hidden lg:inline-flex"
                >
                  {pin.label}
                </a>
              )}
              {review && (
                <a
                  href={review.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-admin-go hidden lg:inline-flex"
                >
                  {review.label}
                </a>
              )}
            </>
          }
        />
      </div>

      {/* Ringing them, and the chat with no template in it.
          A phone is a phone: the board puts these two across the top of an
          order because half of what this page is opened for is a question
          that has to be asked out loud. On a desk they are a number to read
          off, which the header already prints. */}
      <div className="mb-3 flex gap-2 lg:hidden">
        <a href={`tel:${order.customer_phone}`} className="btn-admin min-h-[48px] flex-1">
          Call
        </a>
        <a
          href={whatsappTo(order.customer_phone, "")}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin min-h-[48px] flex-1"
        >
          WhatsApp
        </a>
      </div>

      {/*
       * The phone board's one card where the desk board has four tiles: the
       * total and the state of it on one line, then the three figures under
       * a rule in mono. Four cards of one number each is four fifths of the
       * screen gone before the food.
       */}
      <div className="card mb-3 px-[15px] py-[13px] lg:hidden">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="min-w-0">
            <p className="ticket text-muted">Total</p>
            <p className="font-display text-[36px] font-black leading-none">
              {naira(order.total)}
            </p>
          </div>
          <StatusPill status={order.status} />
        </div>
        <div className="mt-[9px] flex gap-4 border-t-[1.5px] border-rule pt-[9px]">
          <div>
            <p className="ticket text-muted">Food</p>
            <p className="font-mono text-[14.5px] font-semibold">{naira(order.subtotal_food)}</p>
          </div>
          <div>
            <p className="ticket text-muted">Delivery</p>
            <p className="font-mono text-[14.5px] font-semibold">{naira(order.fee)}</p>
          </div>
          {order.discount > 0 && (
            <div>
              <p className="ticket text-muted">Discount</p>
              <p className="font-mono text-[14.5px] font-semibold">
                −{naira(order.discount)}
              </p>
            </div>
          )}
          <div>
            <p className="ticket text-muted">Profit</p>
            <p className="font-mono text-[14.5px] font-semibold text-mint">
              {earned ? naira(earned.profit) : "—"}
            </p>
          </div>
        </div>
      </div>

      <div
        /* The desk's tiles, four across from lg, which is the width the
           boards describe. The phone has its one card above. */
        className={`mb-[18px] hidden lg:grid lg:gap-3.5 ${
          order.discount > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"
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
        {/* What it made, not what state it is in: the chip on the card and
            the story on the right both say the state, and a word set in the
            display face at forty pixels is money's own voice given to
            something that is not money. */}
        <Figure
          label="Profit"
          value={earned ? naira(earned.profit) : "—"}
          tone="mint"
          detail={
            earned === null
              ? "Worked out once this order is paid for"
              : earned.runShare > 0
                ? `After ${naira(earned.runShare)} of run costs`
                : "After the food and the commission on it"
          }
        />
      </div>

      {/* Two columns, as the board draws it: what the order is and what can
          be done to it on the left, and the things you only read on the
          right. One stacked column put the story of the order below four
          cards of controls, where nobody scrolled to it. */}
      <div className="grid items-start gap-[18px] lg:grid-cols-[1.5fr_1fr]">
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
          <Panel size="sm" title="How it went">
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
          <Panel size="sm" title={order.deliver_to_name ?? order.customer_name}>
            <dl className="mt-3 text-[14.5px]">
              {/* How many and how much, which is the whole of what the board
                  asks this panel: a name and a phone number say nothing
                  about whether this is somebody worth ringing back. */}
              {them && them.paidOrders > 0 && (
                <Detail
                  label="Orders"
                  value={
                    `${them.paidOrders}` +
                    (them.since ? ` · since ${monthWord(them.since)}` : "")
                  }
                />
              )}
              {them && them.spend > 0 && (
                <Detail label="Spent" value={naira(them.spend)} />
              )}
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
            <Panel size="sm" title="The rest of this group">
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

      {/* The board's bar: the one or two messages this order is actually
          waiting on, standing over the page where the thumb is. The same two
          links are in the header from `lg`, so neither width is short of
          them and neither has them twice. */}
      {(pin || review) && (
        <div className="phone-bar flex gap-2">
          {pin && (
            <a
              href={pin.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-admin min-h-[50px] flex-1"
            >
              {pin.label}
            </a>
          )}
          {review && (
            <a
              href={review.href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-admin-go min-h-[50px] flex-[1.3]"
            >
              {review.label}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** "Feb", for the month somebody's first order landed in. The board says
 *  "6 · since Feb": the year is noise next to the count, and a person who
 *  started last February is a regular either way. */
function monthWord(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return new Intl.DateTimeFormat("en-NG", { timeZone: TZ, month: "short" }).format(at);
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
