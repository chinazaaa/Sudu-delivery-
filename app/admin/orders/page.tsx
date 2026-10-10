import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import AdminLive from "@/components/admin/AdminLive";
import Figure from "@/components/admin/Figure";
import OrderCard from "@/components/admin/OrderCard";
import WaitingCard from "@/components/admin/WaitingCard";
import HandOverCard from "@/components/admin/HandOverCard";
import ChaseAll from "@/components/admin/ChaseAll";
import { Bar, Picking, Tick } from "@/components/admin/BulkOrders";
import { orderFeed, statusCounts } from "@/lib/admin-data";
import { isGone } from "@/lib/orders";
import { batchOverview } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";
import { siteUrl, toCard } from "@/lib/admin-templates";
import { SLOT_LABEL } from "@/lib/config";
import { lagosClock, lagosToday, runDateLabel } from "@/lib/time";
import { naira } from "@/lib/money";
import { templateFor, whatsappTo } from "@/lib/messages";
import {
  cancelOrder,
  markPaid,
  markDelivered,
  deleteOrder,
  refundOrder,
  savePaymentLink,
  saveOrderNote,
} from "../actions";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS: { value: string; label: string }[] = [
  { value: "pending", label: "Unpaid" },
  { value: "card", label: "Card link" },
  { value: "paid", label: "Paid" },
  { value: "delivered", label: "Delivered" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "Everything" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    batch?: string;
    q?: string;
    promoter?: string;
    deleted?: string;
    /** "new" is the board's New in cut: the jobs rather than the history.
     *  Anything else is All orders, which is what this page has always
     *  been and what a desk opens it for. */
    view?: string;
  }>;
}) {
  const query = await searchParams;
  const cut = query.view === "new" ? "new" : "all";
  const tab = TABS.some((item) => item.value === query.status)
    ? (query.status as string)
    : "pending";
  // Card payers are unpaid orders, narrowed by how they said they would pay.
  const status = (tab === "card" ? "pending" : tab) as OrderStatus | "all";

  const [orders, batches, settings, url, counts, unpaid, everything] = await Promise.all([
    orderFeed({
      status,
      batchId: query.batch ?? null,
      paymentMethod: tab === "card" ? "card" : null,
      search: query.q,
      promoter: query.promoter ?? null,
    }),
    batchOverview(),
    getSettings(),
    siteUrl(),
    statusCounts(),
    // The New in cut, whichever cut is being read: the number on the control
    // has to be right before anybody taps it.
    orderFeed({ status: "pending", limit: 200 }),
    // Today, whatever state it is in. The cut is the day's work and not a
    // list of debts: an order that was paid for the moment it arrived still
    // has to be handed to somebody, and reading only the unpaid ones is how
    // the one order on a Tuesday ended up invisible on the screen that is
    // supposed to be about today.
    orderFeed({ status: "all", limit: 200 }),
  ]);
  // The account every payment message quotes: the first on the list.
  const bank = (await payableAccounts(settings))[0] ?? null;
  // The promoter's name, when the list has been narrowed to one. Read off the
  // orders themselves, so it costs nothing extra.
  const promoterName = query.promoter
    ? orders.find((order) => order.promoter?.code === query.promoter)?.promoter?.name ?? null
    : null;

  /*
   * What needs doing: every unpaid order, soonest run first.
   *
   * Not only the orders on the run that is closing, which is what the board
   * draws. An unpaid order from last week is the one most worth chasing, and
   * scoping this to the current run drops it off the screen altogether. It
   * cannot grow forever either: an order that was meant to be paid and never
   * was gets cancelled, and a cancelled order is not pending.
   *
   * Oldest run at the top, which is the same thing as the run closing
   * soonest: a car from last Friday has closed as hard as a car can.
   */
  const waiting = [...unpaid].sort(
    (a, b) => a.runDate.localeCompare(b.runDate) || a.created_at.localeCompare(b.created_at)
  );

  /*
   * Today, in the order it gets dealt with.
   *
   * Unpaid first, because money is the thing with a deadline on it, then the
   * ones paid for and still to go out, then the ones already handed over.
   * The delivered ones stay on the screen rather than vanishing: a list that
   * empties itself as you work gives no way to check you have finished, and
   * "did I do that one" is the question this cut exists to answer.
   */
  const today = lagosToday();
  const rank = (status: string) =>
    status === "pending" ? 0 : status === "delivered" ? 2 : 1;
  const todays = everything
    .filter((order) => order.runDate === today && !isGone(order.status))
    .sort(
      (a, b) =>
        rank(a.status) - rank(b.status) || a.created_at.localeCompare(b.created_at)
    );

  // Money still out on a run that is not today. The chasing list the cut
  // started as, kept because an order from last Friday is the one most worth
  // a message and today's screen would otherwise drop it.
  const olderUnpaid = waiting.filter((order) => order.runDate !== today);

  // Paid for and still to be handed over, today. The other half of the work.
  const toHandOver = todays.filter((order) => order.status === "paid");

  // What the badge on the control counts: everything on this screen that
  // somebody still has to do something about.
  const jobs = waiting.length + toHandOver.length;
  // The soonest car still taking orders, which is the clock the New in cut
  // is read against.
  const closing = batches
    .filter((one) => one.status === "open")
    .sort((a, b) => a.cut_off_at.localeCompare(b.cut_off_at))[0];

  const unpaidTotal = orders
    .filter((order) => order.status === "pending")
    .reduce((total, order) => total + order.total, 0);
  // Paid, delivered and refunded all mean the money is settled one way or
  // another, so nothing in those views can be waiting on payment.
  const canBeUnpaid = tab === "pending" || tab === "card" || tab === "all";

  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      status: tab,
      batch: query.batch,
      q: query.q,
      promoter: query.promoter,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    return `/admin/orders?${params.toString()}`;
  };

  /*
   * The two cuts, as one control.
   *
   * The board draws it on a phone and nowhere else: a desk has the filter
   * pills and the whole table in front of it, and does not need a cut that
   * hides two thirds of the page. So it is hidden from `lg`, where the pills
   * below already say Unpaid and Waiting on a card link.
   */
  const cuts = (
    <div className="mb-3 flex rounded-full border-2 border-ink bg-wash p-[3px] lg:hidden">
      <Link
        href="/admin/orders?view=new"
        aria-current={cut === "new" ? "page" : undefined}
        className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full text-[14.5px] font-bold ${
          cut === "new" ? "bg-ink text-shell" : "text-muted"
        }`}
      >
        New in
        {jobs > 0 && (
          <span
            className={`rounded-full px-[7px] py-px font-mono text-[11px] ${
              cut === "new" ? "bg-paper text-brand" : "bg-brand text-white"
            }`}
          >
            {jobs}
          </span>
        )}
      </Link>
      <Link
        href="/admin/orders"
        aria-current={cut === "all" ? "page" : undefined}
        className={`flex min-h-[40px] flex-1 items-center justify-center rounded-full text-[14.5px] font-bold ${
          cut === "all" ? "bg-ink text-shell" : "text-muted"
        }`}
      >
        All orders
      </Link>
    </div>
  );

  if (cut === "new") {
    return (
      /* Room under the last card for the bar standing over it. */
      <div className="pb-[72px] lg:pb-0">
        <AdminLive />
        <PageHeader
          title="Orders"
          detail={
            closing
              ? `Today's orders, and anything still owed. The run closes at ${lagosClock(
                  closing.cut_off_at
                )}.`
              : "Today's orders, and anything still owed from a run that has gone."
          }
        />
        {cuts}

        {/* Where the bank alert card goes when there is a feed to read it
            from. Nothing is drawn here until then: a card that says a
            payment landed, on a page that cannot know, is worse than no
            card at all. */}

        {/* The desk's only. The phone board goes title, cut, hint, then the
            cards: a figure saying there are three orders waiting, above
            three cards each of which says so, is a screen of the same
            number. Four across from lg, which is the width the boards
            describe. */}
        <div className="mb-3.5 hidden sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
          <Figure
            label="Waiting"
            value={String(waiting.length)}
            detail="Orders needing money"
          />
          <Figure
            label="Not in yet"
            value={naira(waiting.reduce((total, one) => total + one.total, 0))}
            tone={waiting.length > 0 ? "brand" : "mint"}
            detail="Across all of them"
          />
          <Figure
            label="To hand over"
            value={String(toHandOver.length)}
            detail="Paid for, today"
          />
        </div>

        {/*
          Today, whatever state it is in.

          One card per order, carrying the one thing that order needs: the
          money, or the doorway. Marking the last one delivered marks the run
          delivered too, so a day with one order on it never needs the run
          screen at all. The run screen is still there, and still the right
          place for a stage that has nothing to do with any one order.
        */}
        {todays.length > 0 && (
          <>
            <p className="ticket mb-2 text-muted">
              Today · {todays.length} {todays.length === 1 ? "order" : "orders"}
            </p>
            <div className="space-y-3">
              {todays.map((order) =>
                order.status === "pending" ? (
                  <WaitingCard
                    key={order.id}
                    order={toCard(order, settings, url, bank)}
                    into={bank?.bank_name ?? ""}
                    markPaid={markPaid}
                    savePaymentLink={savePaymentLink}
                  />
                ) : (
                  <HandOverCard
                    key={order.id}
                    order={toCard(order, settings, url, bank)}
                    markDelivered={markDelivered}
                  />
                )
              )}
            </div>
          </>
        )}

        {/* Money still out on a run that has already been and gone. Under
            today rather than mixed into it, because it is chasing rather
            than the day's work, and losing it altogether is how an order
            from last Friday stops being anybody's job. */}
        {olderUnpaid.length > 0 && (
          <>
            <p className="ticket mb-2 mt-3.5 text-muted">
              Still unpaid from earlier runs
            </p>
            <div className="space-y-3">
              {olderUnpaid.map((order) => (
                <WaitingCard
                  key={order.id}
                  order={toCard(order, settings, url, bank)}
                  into={bank?.bank_name ?? ""}
                  markPaid={markPaid}
                  savePaymentLink={savePaymentLink}
                />
              ))}
            </div>
          </>
        )}

        {/* The board's running line under the cards, drawn whether or not
            there are any: it is the answer to "is that everything", and as
            an empty state it only ever appeared on the mornings when nobody
            needed to ask. */}
        <div className="soft mt-3 px-3.5 py-3">
          <strong className="text-[14px]">
            {jobs === 0 ? "Nothing is waiting on you" : "That is everything for today"}
          </strong>
          <p className="hint">
            {todays.length === 0
              ? closing
                ? `Nothing is on today's run yet. It closes at ${lagosClock(closing.cut_off_at)}.`
                : "No run is open, so nothing can be ordered onto today."
              : jobs === 0
                ? `All ${todays.length} of today's ${
                    todays.length === 1 ? "order has" : "orders have"
                  } been paid for and handed over.`
                : `${waiting.length} waiting on money, ${toHandOver.length} paid for and still to go out.`}
          </p>
        </div>

        {/* The way out of the cut, which the board puts at the bottom of it
            as well as in the control at the top: somebody who has dealt with
            the three jobs is usually looking for a fourth order by name. */}
        <Link
          href="/admin/orders"
          className="card mt-3 flex min-h-[52px] items-center gap-2.5 px-3.5 py-3"
        >
          <span className="min-w-0 flex-1">
            <strong className="text-[15px]">All orders</strong>
            <span className="hint block">
              Every order ever placed · {counts.all ?? 0} · search and filter
            </span>
          </span>
          <span className="text-[19px] text-muted" aria-hidden>
            ›
          </span>
        </Link>

        {/* The board's bar. It hands over the messages rather than claiming
            to have sent them, because nothing records that anybody was
            chased. */}
        <ChaseAll
          people={waiting.map((order) => ({
            id: order.id,
            name: (order.for_name ?? order.customer_name).split(" ")[0],
            href: whatsappTo(
              order.customer_phone,
              templateFor({
                kind: "payment",
                name: order.customer_name,
                callsThem: order.callsThem,
                settings,
                siteUrl: url,
              })
            ),
          }))}
        />
      </div>
    );
  }

  return (
    <div>
      <AdminLive />

      <PageHeader
        title="Orders"
        detail="Every order ever placed, whatever run it belongs to."
        actions={
          /* With the filters that are on the screen still on it. Somebody
             exporting while looking at the unpaid tab wants the unpaid
             ones, not all two thousand. */
          <a
            href={`/api/admin/export?what=orders&status=${tab}${
              query.q ? `&q=${encodeURIComponent(query.q)}` : ""
            }${query.promoter ? `&promoter=${encodeURIComponent(query.promoter)}` : ""}`}
            className="btn-admin"
          >
            Export
          </a>
        }
      />

      {cuts}

      {/* Said here rather than on the order's own page, because that page is
          the one thing that no longer exists. */}
      {query.deleted && (
        <p className="mb-4 rounded-r-lg border-l-4 border-volt bg-brand-tint px-[11px] py-2.5 text-[13.5px] font-semibold text-brand-dark">
          {query.deleted} is deleted. It is in the deletions log with who did
          it, and everything it held is written down there.
        </p>
      )}

      {/* The desk's four. The phone board has no figures on this cut
          either: it goes title, cut, hint, search, pills, cards. Four
          across from lg, which is the width the boards describe. */}
      <div className="mb-4 hidden sm:grid sm:grid-cols-2 sm:gap-3.5 lg:grid-cols-4">
        <Figure
          label="Showing"
          value={String(orders.length)}
          detail={TABS.find((one) => one.value === tab)?.label ?? ""}
        />
        <Figure
          label="Value"
          value={naira(orders.reduce((total, order) => total + order.total, 0))}
          detail="Food and delivery"
        />
        {/* Always, because the board's row is always four: dropping it on
            the paid and delivered tabs left three tiles and a gap where
            every other cut has a figure. Nought unpaid in a view that
            cannot hold one is the answer to the question. */}
        <Figure
          label="Unpaid"
          value={naira(unpaidTotal)}
          tone={unpaidTotal > 0 ? "brand" : "mint"}
          detail={
            canBeUnpaid
              ? `${orders.filter((one) => one.status === "pending").length} in this view`
              : "Nothing in this view can be unpaid"
          }
        />
        <Figure
          label="Average order"
          value={naira(
            orders.length === 0
              ? 0
              : orders.reduce((total, order) => total + order.total, 0) / orders.length
          )}
          tone="mint"
          detail="Across what is showing"
        />
      </div>

      {/* Arrived here from a promoter. Say so plainly, and give one tap back
          out of it, so a short list is never mistaken for a quiet week. */}
      {query.promoter && (
        <p className="mb-3 flex flex-wrap items-center gap-2.5 rounded-r-lg border-l-4 border-volt bg-brand-tint px-[11px] py-2.5 text-[13.5px] text-brand-dark">
          <span className="font-semibold">
            Only orders brought in by {promoterName ?? query.promoter}
          </span>
          <Link href={link({ promoter: "" })} className="btn-admin btn-admin-sm">
            Show everyone
          </Link>
        </p>
      )}

      {/* The board puts these the other way round at each width: a phone
          searches by name first and scrolls the pills under the field, a
          desk picks a cut first and searches inside it. One of each, in
          one column, reordered rather than drawn twice. */}
      <div className="flex flex-col">
        {/*
         * Sideways on a phone, wrapped from `lg`.
         *
         * Seven of these do not fit a phone either way. Wrapped they are three
         * rows of chips above the first order, which is the whole screen gone
         * before anything worth reading; the board scrolls them instead and
         * keeps the page. `no-scrollbar` because a scrollbar drawn over a 38px
         * pill eats the bottom of its text, and the pills themselves say
         * plainly that there are more of them off the right.
         */}
        <div className="no-scrollbar -mx-4 order-2 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:order-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
          {TABS.map((item) => {
            // The tab's own count, so the three unpaid orders can be found
            // without opening tabs until one has rows in it. "Everything" is
            // the only one without, because a number there is just the total
            // said twice.
            const count =
              item.value === "all"
                ? null
                : item.value === "card"
                  ? (counts.card ?? 0)
                  : (counts[item.value] ?? 0);
            return (
              <Link
                key={item.value}
                href={link({ status: item.value })}
                className={`pill-admin shrink-0 ${tab === item.value ? "pill-admin-on" : ""}`}
              >
                {item.label}
                {count !== null && (
                  <span className="font-mono opacity-60">{count}</span>
                )}
              </Link>
            );
          })}
        </div>

        <form className="order-1 mb-3 flex flex-wrap gap-2.5 sm:order-2 sm:mb-4" action="/admin/orders">
          <input type="hidden" name="status" value={tab} />
          {query.promoter && (
            <input type="hidden" name="promoter" value={query.promoter} />
          )}
          <input
            name="q"
            defaultValue={query.q ?? ""}
            placeholder="Name, number or block"
            className="field field-admin w-full grow border-[1.5px] border-line bg-paper px-3 sm:w-auto sm:max-w-xs"
          />
          <select
            name="batch"
            defaultValue={query.batch ?? ""}
            className="field field-admin w-auto grow border-[1.5px] border-line bg-paper px-3 sm:max-w-xs"
          >
            <option value="">Every run</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
              </option>
            ))}
          </select>
          <button className="btn-admin">Filter</button>
        </form>
      </div>

      {orders.length === 0 ? (
        <p className="card text-[14.5px] text-muted">
          Nothing here yet. Orders appear the moment somebody checks out.
        </p>
      ) : (
        <Picking>
          {/* The runs an order could be moved onto, and the two messages
              that have to be opened one person at a time. */}
          <Bar
            runs={batches
              .filter((one) => one.status === "open")
              .map((one) => ({
                id: one.id,
                label: `${runDateLabel(one.run_date)} · ${SLOT_LABEL[one.slot]}`,
              }))}
            links={Object.fromEntries(
              orders.map((order) => [
                order.id,
                {
                  name: order.customer_name.split(" ")[0],
                  review: whatsappTo(
                    order.customer_phone,
                    templateFor({
                      kind: "review",
                      name: order.customer_name,
                      settings,
                      siteUrl: url,
                    })
                  ),
                  pin: whatsappTo(
                    order.customer_phone,
                    templateFor({
                      kind: "pin",
                      name: order.customer_name,
                      settings,
                      pin: order.pin ?? null,
                      siteUrl: url,
                    })
                  ),
                },
              ])
            )}
          />

          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={toCard(order, settings, url, bank)}
                lead={
                  <Tick id={order.id} total={order.total} name={order.customer_name} />
                }
                markPaid={markPaid}
                markDelivered={markDelivered}
                refund={refundOrder}
                cancel={cancelOrder}
                remove={deleteOrder}
                savePaymentLink={savePaymentLink}
                saveNote={saveOrderNote}
              />
            ))}
          </div>
        </Picking>
      )}
    </div>
  );
}
