import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { funnel, traffic } from "@/lib/analytics";

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
  const [views, steps] = await Promise.all([traffic(days), funnel(days)]);
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
            { label: "Filled a cart", value: steps.carts },
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
