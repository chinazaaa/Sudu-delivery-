import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { profitByChannel } from "@/lib/profit";
import { naira } from "@/lib/money";
import {
  boxNumbers,
  channels,
  doors,
  feedback,
  funnel,
  ownPages,
  parcelNumbers,
  shelfNumbers,
  traffic,
} from "@/lib/analytics";
import { parseRoutes, routeById } from "@/lib/parcels";
import {
  shopPicture,
  customerPicture,
  whatTheySaid,
  QUIET_AFTER_DAYS,
} from "@/lib/shop-numbers";
import { dashboard } from "@/lib/admin-data";
import { runDateLabel } from "@/lib/time";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const RANGES = [7, 28, 90] as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const asked = Number((await searchParams).days);
  const days = RANGES.includes(asked as (typeof RANGES)[number]) ? asked : 7;

  // Null means nothing is counting yet. The rest of the page still works.
  const [views, steps, said, shelf, boxes, parcels, settings, came, ways, earned, mine, shop, who, board, saidWhere] =
    await Promise.all([
    traffic(days),
    funnel(days),
    feedback(days),
    shelfNumbers(days),
    boxNumbers(days),
    parcelNumbers(days),
    safeSettings(),
    channels(days),
    doors(days),
    profitByChannel(days),
    // Every page this shop wrote, including the ones nobody has opened.
    ownPages(days),
    // The shop itself: what each counter sold, and how much of what is on
    // sale has ever been bought by anybody.
    shopPicture(days),
    customerPicture(days),
    dashboard(days),
    // Their own words for where they heard about us.
    whatTheySaid(),
  ]);
  const busiest = views ? Math.max(...views.perDay.map((day) => day.views), 1) : 1;
  // A route is stored by its id, and the id is not what anybody calls it.
  const routes = parseRoutes(settings.parcel_routes);
  const routeLabel = (id: string) => routeById(routes, id)?.label ?? id;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        detail="Who is looking, what they look at, and how many of them order."
        actions={
          <span className="flex gap-2">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={`/admin/analytics?days=${range}`}
                className={`chip py-1.5 text-xs ${
                  range === days ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
                }`}
              >
                {range} days
              </Link>
            ))}
          </span>
        }
      />

      {views === null && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nothing is counting views yet. Run supabase/update.sql and this page
          fills up from the next visitor. Everything below about carts and
          orders is already true.
        </p>
      )}

      {/*
        The shop, before the traffic.

        This page opened on views and a conversion rate, which is the shape
        a page like this takes when it is copied from a website that sells
        software. Twenty-nine paid orders is not a sample: a percentage of
        it is a coin toss with a decimal point on it, and the four figures
        that matter are all counts somebody could check by hand.
      */}
      <section className="card space-y-3">
        <h2 className="font-bold">The shop</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Customers"
            value={who.all}
            hint={`${who.repeat} came back · ${who.fresh} new in ${days} days`}
          />
          <Stat
            label="An order"
            value={who.perOrder}
            money
            hint={`A customer is worth ${naira(who.perCustomer)}`}
          />
          <Stat
            label="Counters selling"
            value={shop.counters.filter((one) => one.everSold > 0).length}
            hint={`Of ${shop.counters.length} on the shop`}
          />
          <Stat
            label="Things ever sold"
            value={shop.everSold}
            hint={`Of ${shop.onSale.toLocaleString()} on sale`}
          />
        </div>
        {/* The one number this shop should look at. Said as a sentence,
            because as a tile it reads as a statistic and as a sentence it
            reads as the morning's work. */}
        {shop.onSale > 0 && shop.everSold < shop.onSale / 2 && (
          <p className="soft bg-brand-tint px-3 py-2.5 text-sm">
            <strong>
              {(shop.onSale - shop.everSold).toLocaleString()} things are on
              sale that nobody has ever ordered.
            </strong>{" "}
            A menu is not a warehouse: every one of them is a row somebody
            scrolls past to reach the thing they wanted, and a page Google
            crawls instead of a page that sells. The counters below say
            which shelves they are on.
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Views" value={views?.views ?? 0} hint={`Last ${days} days`} />
        {/* People who read a second page. The raw browser count is said
            underneath rather than dropped: it is a true count of what hit
            the server, it is simply not a count of people, and a
            conversion rate with it underneath said this shop converts
            nobody when it converts rather well. */}
        <Stat
          label="People"
          value={views?.people ?? 0}
          hint={
            views && views.visitors > views.people
              ? `${views.visitors.toLocaleString()} browsers, most read one page and went`
              : "Read more than one page"
          }
        />
        <Stat label="Orders" value={steps.orders} hint={`${steps.paid} paid`} />
        <Stat
          label="Look to order"
          value={
            steps.visitors > 0
              ? `${Math.round((steps.orders / steps.visitors) * 100)}%`
              : "0%"
          }
          hint="Of the people who read a second page"
        />
      </div>

      {/* The shelf on its own. Its orders are in every total above, which is
          right, and that is exactly what hides whether the shelf itself is
          working: two thousand products beside a pizza shop is either a
          second business or a page nobody opens. */}
      {/* Boxes on their own. Three cards selling evenly and one card
          selling everything are the same revenue on the totals above and
          completely different businesses. */}
      {boxes && (boxes.orders > 0 || boxes.quiet.length > 0) && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Boxes</h2>
            <p className="text-sm text-muted">
              Counted again on their own. These orders are also in the totals
              above.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Box orders"
              value={boxes.orders}
              hint={`${boxes.paid} paid · last ${days} days`}
            />
            <Stat label="Food" value={boxes.food} money hint="What the boxes came to" />
            <Stat label="Delivery" value={boxes.delivery} money hint="What the cars took" />
            <Stat
              label="Average box"
              value={boxes.orders > 0 ? Math.round((boxes.food + boxes.delivery) / boxes.orders) : 0}
              money
              hint="All in"
            />
          </div>

          {boxes.boxes.length > 0 && (
            <div>
              <p className="label mb-1">Which ones sold</p>
              <ul className="divide-y divide-black/5 text-sm">
                {boxes.boxes.map((one) => (
                  <li key={`${one.occasion}-${one.name}`} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      {one.name}
                      {one.occasion !== "" && (
                        <span className="text-muted"> · {one.occasion}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {one.orders} · {naira(one.money)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {boxes.quiet.length > 0 && (
            <div>
              <p className="label mb-1">Nobody has ordered from</p>
              <p className="text-sm text-muted">{boxes.quiet.join(" · ")}</p>
              <p className="mt-1 text-xs text-muted">
                An occasion with views and no orders is the wrong basket. One
                with neither is the wrong occasion. The page above says which.
              </p>
            </div>
          )}
        </section>
      )}

      {shelf && (shelf.orders > 0 || shelf.waiting > 0) && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Skincare</h2>
            <p className="text-sm text-muted">
              Counted again on its own. These orders are also in the totals
              above.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Orders"
              value={shelf.orders}
              hint={`${shelf.paid} paid · last ${days} days`}
            />
            <Stat label="Products" value={shelf.food} money hint="What they bought" />
            <Stat label="Delivery" value={shelf.delivery} money hint="What the cars took" />
            <Stat
              label="On the next car"
              value={shelf.waiting}
              hint="Ordered, not gone yet"
            />
          </div>

          {shelf.top.length > 0 && (
            <div>
              <p className="label mb-1">What sold</p>
              <ul className="space-y-1">
                {shelf.top.map((one) => (
                  <li
                    key={one.name}
                    className="flex items-center justify-between gap-3 rounded-xl bg-shell px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{one.name}</span>
                    <span className="shrink-0 font-bold">{one.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {parcels && parcels.sent > 0 && (
        <section className="card space-y-3">
          <div>
            <h2 className="font-bold">Parcels</h2>
            <p className="text-sm text-muted">
              Nothing is bought on a parcel, so every naira here is the fee.
              These are also in the totals above, where they read as a run
              with no food cost.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Sent"
              value={parcels.sent}
              hint={`${parcels.paid} paid · last ${days} days`}
            />
            <Stat label="Money in" value={parcels.money} money hint="Paid parcels" />
            <Stat
              label="Waiting on a day"
              value={parcels.waitingOnDay}
              tone={parcels.waitingOnDay > 0 ? "warn" : undefined}
              hint="You have not agreed one"
            />
            <Stat
              label="Handed over"
              value={parcels.delivered}
              hint={`${parcels.trips} trip${parcels.trips === 1 ? "" : "s"} driven`}
            />
          </div>

          {parcels.routes.length > 0 && (
            <div>
              <p className="label mb-1">Which way they go</p>
              <ul className="space-y-1">
                {parcels.routes.map((one) => (
                  <li
                    key={one.route}
                    className="flex items-center justify-between gap-3 rounded-xl bg-shell px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {routeLabel(one.route)}
                    </span>
                    <span className="shrink-0">
                      <span className="font-bold">{one.sent}</span>
                      <span className="text-muted"> · {naira(one.money)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="card space-y-3">
        <div>
          <h2 className="font-bold">How far people get</h2>
          <p className="text-sm text-muted">
            Each step is a smaller number than the one above it. The gaps are
            where the money is.
          </p>
        </div>
        <ul className="space-y-2">
          {[
            { label: "Looked at the shop", value: steps.visitors },
            { label: "Opened their cart", value: steps.openedCart },
            { label: "Left a number at checkout", value: steps.gaveNumber },
            { label: "Placed an order", value: steps.orders },
            { label: "Paid for it", value: steps.paid },
          ].map((step, index, all) => {
            const top = Math.max(all[0].value, 1);
            return (
              <li key={step.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={index === 0 ? "font-semibold" : ""}>{step.label}</span>
                  <span className="font-bold">{step.value}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, (step.value / top) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {views && views.perDay.length > 0 && (
        <section className="card space-y-3">
          <h2 className="font-bold">Day by day</h2>
          {/* Bars are capped and the row is left aligned. Stretching one day
              across the whole card drew a solid orange wall that said nothing.
              The number sits above the bar because a hover title is no use on
              the phone this is read on. */}
          <ul className="flex items-end gap-2 overflow-x-auto pb-1">
            {views.perDay.map((day) => (
              <li key={day.date} className="w-10 shrink-0">
                <p className="text-center text-[11px] font-bold text-ink">{day.views}</p>
                <div
                  title={`${day.date}: ${day.views} views, ${day.visitors} people`}
                  className="mx-auto mt-0.5 w-full rounded-t bg-brand"
                  style={{ height: `${Math.max(4, (day.views / busiest) * 120)}px` }}
                />
                <p className="mt-1 text-center text-[10px] text-muted">
                  {new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Views each day, busiest day at full height. One bar means one day of
            figures so far.
          </p>
        </section>
      )}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">What people said</h2>
          {said.average !== null && (
            <span className="text-sm text-muted">
              <span className="text-lg font-extrabold text-ink">{said.average}</span> out of 5,
              from {said.count} {said.count === 1 ? "answer" : "answers"}
            </span>
          )}
        </div>

        {said.count === 0 ? (
          <p className="text-sm text-muted">
            Nobody has rated a run yet. The stars appear on their order page once the
            food has been handed out.
          </p>
        ) : (
          <>
            {/* Five rows rather than an average alone: one furious customer and
                nine happy ones average out to something that sounds fine. */}
            <ul className="space-y-1">
              {[5, 4, 3, 2, 1].map((score) => (
                <li key={score} className="flex items-center gap-2 text-sm">
                  <span className="w-10 shrink-0 font-semibold">{score} ★</span>
                  <span className="h-2 grow overflow-hidden rounded-full bg-black/[0.06]">
                    <span
                      className={`block h-full rounded-full ${
                        score <= 2 ? "bg-brand-dark" : "bg-brand"
                      }`}
                      style={{
                        width: `${Math.round(((said.spread[score] ?? 0) / said.count) * 100)}%`,
                      }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right text-muted">
                    {said.spread[score] ?? 0}
                  </span>
                </li>
              ))}
            </ul>

            {said.recent.length > 0 && (
              <ul className="divide-y divide-black/5">
                {said.recent.map((one) => (
                  <li key={one.id} className="py-3">
                    <div className="flex flex-wrap items-baseline gap-2 text-sm">
                      <span className={one.rating <= 2 ? "font-bold text-brand-dark" : "font-bold"}>
                        {"★".repeat(one.rating)}
                        <span className="text-black/20">{"★".repeat(5 - one.rating)}</span>
                      </span>
                      <span className="font-semibold">{one.name}</span>
                      <span className="text-muted">{one.run}</span>
                      {one.ref && (
                        <Link
                          href={`/admin/orders/${one.id}`}
                          className="text-xs font-semibold text-brand"
                        >
                          {one.ref}
                        </Link>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink/80">{one.feedback}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/*
        Every counter, with what it sold and what it is carrying.

        Fifteen of them, so all fifteen are here. A list cut at ten would
        hide exactly the counters worth knowing about, which are the ones
        at the bottom: a shelf carrying eight hundred things that has sold
        two of them is not a counter, it is a catalogue somebody imported
        and never came back to.
      */}
      {shop.counters.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">Every counter</h2>
          <p className="hint">
            What went over each one in the last {days} days. The shelf
            figures are all time, because a thing that sold once in May is a
            thing that sells.
          </p>
          <ul className="divide-y divide-black/5 text-sm">
            {shop.counters.map((one) => (
              <li key={one.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
                <Link
                  href={`/admin/brands?brand=${one.id}`}
                  className="min-w-0 flex-1 truncate font-semibold"
                >
                  {one.name}
                </Link>
                <span className="shrink-0 font-mono text-[13px]">
                  {one.orders === 0 ? (
                    <span className="text-muted">nothing in {days} days</span>
                  ) : (
                    <>
                      {naira(one.spend)} · {one.orders}{" "}
                      {one.orders === 1 ? "order" : "orders"}
                    </>
                  )}
                </span>
                <span className="w-full text-xs text-muted">
                  {one.everSold} of {one.onSale.toLocaleString()}{" "}
                  {one.onSale === 1 ? "thing" : "things"} on its shelf has ever
                  sold
                  {one.lastAt !== null
                    ? ` · last ${runDateLabel(one.lastAt.slice(0, 10))}`
                    : " · never"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Everybody, because everybody fits.

        A repeat rate tells somebody "five came back" in a way they cannot
        act on: nobody can ring a percentage. The quiet list is the one
        that earns its place. At twenty customers, somebody who ordered
        three times and has not been seen for a month has not churned,
        they have got busy, and that is a message rather than a strategy.
      */}
      {who.best.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">Everybody who has ordered</h2>
          <p className="hint">
            All {who.all} of them, most spent first. {who.repeat} have ordered
            more than once.
          </p>
          <ul className="divide-y divide-black/5 text-sm">
            {who.best.map((one) => (
              <li key={one.phone} className="flex items-baseline justify-between gap-3 py-2">
                <Link
                  href={`/admin/customers?q=${encodeURIComponent(one.phone)}`}
                  className="min-w-0 truncate"
                >
                  <span className="font-semibold">{one.name || one.phone}</span>
                  <span className="ml-2 text-xs text-muted">
                    {one.orders} {one.orders === 1 ? "order" : "orders"}
                    {one.lastAt
                      ? ` · last ${runDateLabel(one.lastAt.slice(0, 10))}`
                      : ""}
                  </span>
                </Link>
                <span className="shrink-0 font-mono text-[13px]">
                  {naira(one.spend)}
                </span>
              </li>
            ))}
          </ul>
          {who.quiet.length > 0 && (
            <div className="soft bg-brand-tint px-3 py-2.5">
              <p className="text-sm font-semibold">
                {who.quiet.length}{" "}
                {who.quiet.length === 1 ? "person has" : "people have"} not
                ordered in {QUIET_AFTER_DAYS} days
              </p>
              <p className="hint mt-1">
                {who.quiet.slice(0, 12).map((one, at, all) => (
                  <span key={one.phone}>
                    <Link
                      href={`/admin/customers?q=${encodeURIComponent(one.phone)}`}
                      className="font-semibold text-brand-dark"
                    >
                      {one.name || one.phone}
                    </Link>
                    {at < all.length - 1 ? " · " : ""}
                  </span>
                ))}
                {who.quiet.length > 12 ? ` and ${who.quiet.length - 12} more` : ""}
              </p>
            </div>
          )}
        </section>
      )}

      {/*
        What sold, and which day earned.

        Both read off the orders rather than off anything counting views,
        so they are true whether or not a single visit was ever recorded.
      */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-2">
          <h2 className="font-bold">What sold</h2>
          <p className="hint">Last {days} days, by how many went out.</p>
          {board.topItems.length > 0 ? (
            <ul className="divide-y divide-black/5 text-sm">
              {board.topItems.map((item) => (
                <li
                  key={`${item.restaurant}-${item.name}`}
                  className="flex items-baseline justify-between gap-3 py-2"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{item.name}</span>
                    <span className="ml-2 text-xs text-muted">{item.restaurant}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{item.qty}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing sold in this window.</p>
          )}
        </section>

        <section className="card space-y-2">
          <h2 className="font-bold">Which day is worth a car</h2>
          <p className="hint">Last {days} days, by what came in.</p>
          {board.byWeekday.some((day) => day.orders > 0) ? (
            <ul className="divide-y divide-black/5 text-sm">
              {board.byWeekday.map((day) => {
                const most = Math.max(...board.byWeekday.map((one) => one.gross), 1);
                return (
                  <li key={day.label} className="py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{day.label}</span>
                      <span className="font-mono text-[13px]">
                        {day.orders === 0 ? (
                          <span className="text-muted">nothing</span>
                        ) : (
                          <>
                            {naira(day.gross)} · {day.orders}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-[7px] rounded-full bg-rule">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.round((day.gross / most) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet.</p>
          )}
        </section>
      </div>

      {/*
        Where they heard about us, in their own words.

        The dropdown at the checkout offers a name or two and a channel,
        and everybody else picks "Somewhere else". Those are most people,
        and at a university almost every real answer is a sentence rather
        than an option. This is the only free text the shop ever gets about
        how somebody found it, so it is shown as written rather than sorted
        into categories decided in advance.
      */}
      {saidWhere.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">How they say they found us</h2>
          <p className="hint">
            Typed into the box under &ldquo;Somewhere else&rdquo;, in their own
            words.
          </p>
          <ul className="divide-y divide-black/5 text-sm">
            {saidWhere.map((one) => (
              <li key={one.phone} className="py-2">
                <span className="block">{one.said}</span>
                <Link
                  href={`/admin/customers?q=${encodeURIComponent(one.phone)}`}
                  className="text-xs font-semibold text-brand-dark"
                >
                  {one.name || one.phone}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Every page the shop wrote, including the noughts.

        "What they looked at" below is sorted by views, so it can only ever
        name pages somebody looked at. The question actually worth asking is
        the other one, and it has no row in that list: nine pages were
        written for the services this shop offers and there was no way to
        find out that nobody has opened one of them since it went up.

        People rather than views, because one person reloading a page
        eleven times is one person who was interested, and a page written to
        be found by a stranger is doing nothing if everybody on it was
        already shopping.
      */}
      {mine && (
        <section className="card mb-4 space-y-2">
          <h2 className="font-bold">Your own pages</h2>
          <p className="hint">
            Every page the shop wrote, over the last {days} days. Admin is
            never counted, so none of this is you checking a page works.
          </p>
          {(() => {
            const quiet = mine.filter((one) => one.people === 0);
            const busiest = Math.max(...mine.map((one) => one.people), 1);
            return (
              <>
                <ul className="divide-y divide-black/5 text-sm">
                  {mine
                    .filter((one) => one.people > 0)
                    .map((page) => (
                      <li key={page.path} className="py-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <Link
                            href={page.path}
                            className="min-w-0 truncate font-semibold"
                          >
                            {page.said}
                          </Link>
                          <span className="shrink-0 text-muted">
                            <span className="font-semibold text-ink">
                              {page.people}
                            </span>{" "}
                            {page.people === 1 ? "person" : "people"} · {page.views}{" "}
                            {page.views === 1 ? "view" : "views"}
                          </span>
                        </div>
                        <div className="mt-1 h-[7px] rounded-full bg-rule">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{
                              width: `${Math.round((page.people / busiest) * 100)}%`,
                            }}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
                {/* Two different noughts, and only one of them means
                    anything.

                    A page that went up on Saturday has had no chance to be
                    found, and reading its nought as neglect is how a shop
                    talks itself out of a page before anybody has seen it.
                    A page that has been up for months with nobody on it is
                    a different sentence entirely. */}
                {quiet.filter((one) => !one.tooNew).length > 0 && (
                  <div className="soft mt-1 bg-brand-tint px-3 py-2.5">
                    <p className="text-sm font-semibold">
                      Nobody opened{" "}
                      {quiet.filter((one) => !one.tooNew).length} of them in{" "}
                      {days} days
                    </p>
                    <p className="hint mt-1">
                      {quiet
                        .filter((one) => !one.tooNew)
                        .map((one, at, all) => (
                          <span key={one.path}>
                            <Link href={one.path} className="font-semibold text-brand-dark">
                              {one.said}
                            </Link>
                            {at < all.length - 1 ? " · " : ""}
                          </span>
                        ))}
                    </p>
                    <p className="hint mt-1.5">
                      A page nobody finds is a page nothing links to. These
                      are the ones to put in a bio, a status or a poster, or
                      to stop keeping.
                    </p>
                  </div>
                )}
                {quiet.filter((one) => one.tooNew).length > 0 && (
                  <p className="hint mt-1">
                    Too new to tell yet:{" "}
                    {quiet
                      .filter((one) => one.tooNew)
                      .map((one, at, all) => (
                        <span key={one.path}>
                          <Link href={one.path} className="font-semibold text-brand-dark">
                            {one.said}
                          </Link>
                          {one.age !== null ? ` (${one.age}d)` : ""}
                          {at < all.length - 1 ? " · " : ""}
                        </span>
                      ))}
                    . Google has not finished crawling a page that went up
                    this week, and nothing links to it yet.
                  </p>
                )}
              </>
            );
          })()}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card space-y-2">
          <h2 className="font-bold">What they looked at</h2>
          {views && views.pages.length > 0 ? (
            <ul className="divide-y divide-black/5 text-sm">
              {views.pages.map((page) => (
                <li key={page.path} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{page.label}</span>
                  <span className="shrink-0 font-semibold">{page.views}</span>
                </li>
              ))}
              {/* The busiest twelve and then everything else, because a
                * column of numbers that does not add up to the total above
                * it reads as a bug. Most of the rest is one view each on
                * one product page. */}
              {views.restViews > 0 ? (
                <li className="flex justify-between gap-3 py-2 text-muted">
                  <span className="min-w-0 truncate">
                    {views.restPages} other {views.restPages === 1 ? "page" : "pages"}
                  </span>
                  <span className="shrink-0 font-semibold">{views.restViews}</span>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet.</p>
          )}
        </section>

        <section className="card space-y-2">
          <h2 className="font-bold">Where they came from</h2>
          {views && views.sources.length > 0 ? (
            <ul className="divide-y divide-black/5 text-sm">
              {views.sources.map((source) => (
                <li key={source.source} className="flex justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{source.source}</span>
                  <span className="shrink-0 font-semibold">{source.views}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing yet.</p>
          )}
          <p className="text-xs text-muted">
            A link opened from inside WhatsApp usually arrives with nothing
            attached, so it counts as typed or a link. The same is true of
            an assistant: ChatGPT opens its links without saying where they
            came from, and its app has a browser of its own that says
            nothing either. Somebody sent here by one will nearly always
            land under typed or a link, however they found us.
          </p>
          {/* So the honest answer to "did ChatGPT bring anybody" is not on
              this card and cannot be. It is what the customer said. */}
          <p className="text-xs text-muted">
            Who actually sent somebody is the answer they gave at checkout,
            and it is counted on{" "}
            <Link href="/admin/sources" className="font-semibold underline">
              Sources
            </Link>
            .
          </p>
        </section>

        {/*
          * Which door the orders came through.
          *
          * Three ways in now, and each one is somebody's week of work. The
          * chat was built on the argument that the shortest route to a
          * pizza was four pages and fourteen taps; this is the number that
          * says whether that was true, and the number to look at before
          * spending another week on any of the three.
          */}
        <section className="card space-y-2 lg:col-span-2">
          <h2 className="font-bold">Website, app, or the chat</h2>
          <p className="text-sm text-muted">
            Where the orders were placed, out of everything in the window
            that was not cancelled or refunded.
          </p>
          {ways && ways.length > 0 ? (
            <>
              <div className="space-y-2">
                {ways.map((one) => (
                  <div key={one.source || "unknown"} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-semibold">{one.label}</span>
                      <span className="text-muted">
                        <b className="text-ink">{one.share}%</b> · {one.orders} order
                        {one.orders === 1 ? "" : "s"} · {one.paid} paid
                        {one.money > 0 ? ` · ${naira(one.money)}` : ""}
                      </span>
                    </div>
                    {/* A bar rather than a pie: five labels round a circle
                        on a phone is a legend nobody reads, and the thing
                        being compared here is one number each. */}
                    <div className="h-2 overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(one.share, 1)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                Orders placed before this was recorded sit under &quot;Not
                known&quot; and thin out on their own.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No orders in this window yet.</p>
          )}
        </section>

        <section className="card space-y-2 lg:col-span-2">
          <h2 className="font-bold">What each one is actually worth</h2>
          <p className="text-sm text-muted">
            The same question as the card beside it, asked of orders instead
            of visits. A hundred people off Instagram who never order are
            worth less than nine off Google who do.
          </p>
          {came && came.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">From</th>
                    <th className="py-2 pr-3 text-right font-semibold">People</th>
                    <th className="py-2 pr-3 text-right font-semibold">Orders</th>
                    <th className="py-2 pr-3 text-right font-semibold">Paid</th>
                    <th className="py-2 pr-3 text-right font-semibold">Money</th>
                    <th className="py-2 text-right font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {came.map((one) => (
                    <tr key={one.channel || "unknown"}>
                      <td className="py-2 pr-3 font-medium">{one.label}</td>
                      <td className="py-2 pr-3 text-right">{one.visitors || "-"}</td>
                      <td className="py-2 pr-3 text-right">{one.orders || "-"}</td>
                      <td className="py-2 pr-3 text-right">{one.paid || "-"}</td>
                      <td className="py-2 pr-3 text-right">
                        {one.money > 0 ? naira(one.money) : "-"}
                      </td>
                      {/* What is left of it after the car. Money in is the
                          easy half: a channel bringing big orders onto
                          half-empty cars is worth less than one filling a
                          run somebody was driving anyway, and revenue
                          cannot tell those apart. */}
                      <td className="py-2 text-right font-semibold">
                        {earned[one.channel || ""]
                          ? `${naira(earned[one.channel || ""].profit)}${
                              earned[one.channel || ""].estimated ? "*" : ""
                            }`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing yet.</p>
          )}
          <p className="text-xs text-muted">
            Only counts orders placed since this started recording, so
            anything older sits under &quot;Not known&quot; and will thin out
            on its own. Add ?utm_source=instagram to a link in a bio and it
            lands under Instagram; Google needs nothing, since a search
            result cannot carry one.
          </p>
          {/* Said plainly, because a figure somebody is going to spend money
              on the strength of should say how it was arrived at. */}
          <p className="text-xs text-muted">
            Profit is a share, not a measurement. One car carries one tank of
            fuel and one driver for everything on it, so each run&apos;s
            profit is split across its orders by what each was worth, and
            each order&apos;s share counts to whatever brought it. A star
            means a run in there has no costs typed in yet, so that figure is
            the best case rather than the figure.
          </p>
        </section>
      </div>
    </div>
  );
}
