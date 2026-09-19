import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { feedback, funnel, traffic } from "@/lib/analytics";

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
  const [views, steps, said] = await Promise.all([
    traffic(days),
    funnel(days),
    feedback(days),
  ]);
  const busiest = views ? Math.max(...views.perDay.map((day) => day.views), 1) : 1;

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Views" value={views?.views ?? 0} hint={`Last ${days} days`} />
        <Stat label="People" value={views?.visitors ?? 0} hint="Different browsers" />
        <Stat label="Orders" value={steps.orders} hint={`${steps.paid} paid`} />
        <Stat
          label="Look to order"
          value={
            steps.visitors > 0
              ? `${Math.round((steps.orders / steps.visitors) * 100)}%`
              : "0%"
          }
          hint="Of the people who looked"
        />
      </div>

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
            attached, so it counts as typed or a link.
          </p>
        </section>
      </div>
    </div>
  );
}
