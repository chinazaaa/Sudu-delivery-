import PageHeader from "@/components/admin/PageHeader";
import Link from "next/link";
import AdminLive from "@/components/admin/AdminLive";
import Figure from "@/components/admin/Figure";
import OrderCard from "@/components/admin/OrderCard";
import WaitingCard from "@/components/admin/WaitingCard";
import ChaseAll from "@/components/admin/ChaseAll";
import { Bar, Picking, Tick } from "@/components/admin/BulkOrders";
import { orderFeed, statusCounts } from "@/lib/admin-data";
import { batchOverview } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { payableAccounts } from "@/lib/banks";
import { siteUrl, toCard } from "@/lib/admin-templates";
import { SLOT_LABEL } from "@/lib/config";
import { lagosClock, runDateLabel } from "@/lib/time";
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
  { value: "card", label: "Waiting on a card link" },
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

  const [orders, batches, settings, url, counts, unpaid] = await Promise.all([
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
        {waiting.length > 0 && (
          <span
            className={`rounded-full px-[7px] py-px font-mono text-[11px] ${
              cut === "new" ? "bg-paper text-brand" : "bg-brand text-white"
            }`}
          >
            {waiting.length}
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
              ? `Orders that need you before the run closes at ${lagosClock(
                  closing.cut_off_at
                )}.`
              : "Orders waiting on money or on a card link."
          }
        />
        {cuts}

        {/* Where the bank alert card goes when there is a feed to read it
            from. Nothing is drawn here until then: a card that says a
            payment landed, on a page that cannot know, is worse than no
            card at all. */}

        <div className="mb-3.5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          <Figure
            label="Waiting"
            value={String(waiting.length)}
            detail="Orders needing you"
          />
          <Figure
            label="Not in yet"
            value={naira(waiting.reduce((total, one) => total + one.total, 0))}
            tone={waiting.length > 0 ? "brand" : "mint"}
            detail="Across all of them"
          />
        </div>

        {waiting.length === 0 ? (
          <div className="soft px-3.5 py-3">
            <strong className="text-[14px]">Everything else is paid</strong>
            <p className="hint">
              {closing
                ? `${closing.orderCount} order${
                    closing.orderCount === 1 ? "" : "s"
                  } on this run, nothing outstanding.`
                : "No order anywhere is waiting on money."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {waiting.map((order) => (
              <WaitingCard
                key={order.id}
                order={toCard(order, settings, url, bank)}
                into={bank?.bank_name ?? ""}
                markPaid={markPaid}
                savePaymentLink={savePaymentLink}
              />
            ))}
          </div>
        )}

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

      {/* Two up on a phone, which is what the board draws and what the
          figure card is now sized for: one number per row is four screens
          of numbers before the first order. */}
      <div className="mb-4 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
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
        {/* Only where the view can hold an unpaid order. Filtered to paid it
            was a card reporting zero every time, which is not news. */}
        {canBeUnpaid && (
          <Figure
            label="Unpaid"
            value={naira(unpaidTotal)}
            tone={unpaidTotal > 0 ? "brand" : "mint"}
            detail={`${orders.filter((one) => one.status === "pending").length} in this view`}
          />
        )}
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
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
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

      <form className="mb-4 flex flex-wrap gap-2.5" action="/admin/orders">
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
