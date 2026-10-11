import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { naira } from "@/lib/money";
import { brandNumbers, brandsForPicker } from "@/lib/brand-numbers";

export const dynamic = "force-dynamic";

const RANGES = [0, 28, 90] as const;
const RANGE_WORD: Record<number, string> = {
  0: "All time",
  28: "28 days",
  90: "90 days",
};

/**
 * One kitchen, in the numbers that kitchen would ask for.
 *
 * Written for a meeting rather than for a dashboard. Walking into a brand
 * and saying students want you on campus is an opinion. Saying we have
 * spent this much with you, across this many orders, and here is what they
 * actually buy, is a fact they can take to whoever signs things.
 *
 * One page with a picker rather than a page each, because the question is
 * always the same question and only the name changes.
 */
export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; days?: string }>;
}) {
  const asked = await searchParams;
  const brands = await brandsForPicker();

  const days = RANGES.includes(Number(asked.days) as (typeof RANGES)[number])
    ? Number(asked.days)
    : 0;
  // The first kitchen unless one is named, so the page is never a picker
  // standing on its own with nothing under it.
  const chosen = brands.find((one) => one.id === asked.brand) ?? brands[0] ?? null;
  const numbers = chosen ? await brandNumbers(chosen.id, days) : null;

  const since = (iso: string | null) =>
    iso === null
      ? "—"
      : new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

  const mostQty = Math.max(1, ...(numbers?.best ?? []).map((one) => one.qty));
  const mostMonth = Math.max(1, ...(numbers?.byMonth ?? []).map((one) => one.spend));

  return (
    <div className="space-y-[18px]">
      <PageHeader
        title="Brands"
        detail="What we have bought from each kitchen, for the conversation where you tell them."
        backHref="/admin/more"
        backLabel="More"
        actions={
          <span className="flex flex-wrap gap-1.5">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={`/admin/brands?brand=${encodeURIComponent(chosen?.id ?? "")}&days=${range}`}
                className={`chip py-1.5 text-xs ${
                  range === days ? "border-ink bg-ink text-white" : "border-black/10 bg-white"
                }`}
              >
                {RANGE_WORD[range]}
              </Link>
            ))}
          </span>
        }
      />

      {brands.length === 0 ? (
        <p className="card text-sm text-muted">
          No kitchens on the menu yet, so there is nothing to count.
        </p>
      ) : (
        <>
          {/* A plain form rather than anything clever: picking a kitchen
              reloads the page with it named in the address, so a page that
              is useful in a meeting can be bookmarked and sent. */}
          <form method="get" className="card flex flex-wrap items-end gap-3">
            <input type="hidden" name="days" value={String(days)} />
            <div className="min-w-[220px] flex-1">
              <label className="label" htmlFor="brand">
                Kitchen
              </label>
              <select
                id="brand"
                name="brand"
                defaultValue={chosen?.id ?? ""}
                className="field"
              >
                {brands.map((one) => (
                  <option key={one.id} value={one.id}>
                    {one.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-admin-go">
              Show
            </button>
          </form>

          {numbers === null || numbers.orders === 0 ? (
            <p className="card text-sm text-muted">
              Nobody has ordered from {chosen?.name ?? "this kitchen"}
              {days > 0 ? ` in the last ${days} days` : " yet"}. That is worth
              knowing too: it is the kitchen to put in front of people rather
              than the one to go and talk to.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                {/* Their takings from us, not what the customer paid: the
                    delivery fee is ours and is none of their business. */}
                <Stat
                  label="Spent at their counter"
                  value={numbers.spend}
                  money
                  tone="good"
                  hint={days > 0 ? `Last ${days} days` : "All time"}
                />
                <Stat label="Orders" value={numbers.orders} />
                <Stat label="Items bought" value={numbers.items} />
                <Stat
                  label="Students"
                  value={numbers.customers}
                  hint="Different people, not orders"
                />
              </div>

              <div className="card">
                <p className="ticket text-muted">The relationship</p>
                <p className="mt-1 text-[15px] leading-[1.5]">
                  We have been buying from {chosen?.name} since{" "}
                  <strong>{since(numbers.firstAt)}</strong>, most recently on{" "}
                  <strong>{since(numbers.lastAt)}</strong>. That is{" "}
                  <strong>{naira(numbers.spend)}</strong> across{" "}
                  <strong>{numbers.orders}</strong>{" "}
                  {numbers.orders === 1 ? "order" : "orders"} from{" "}
                  <strong>{numbers.customers}</strong>{" "}
                  {numbers.customers === 1 ? "student" : "students"} at
                  Pan-Atlantic University, none of whom any delivery app
                  reaches.
                </p>
                <p className="hint mt-2 leading-[1.5]">
                  Refunded and cancelled orders are left out, so every figure
                  here is one they can check against their own till.
                </p>
              </div>

              <div className="card">
                <p className="ticket text-muted">What sells</p>
                {numbers.best.map((one) => (
                  <div
                    key={one.name}
                    className="flex items-center gap-3 border-t-[1.5px] border-rule py-2.5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {one.name}
                      </span>
                      {/* A bar rather than only a number, because the shape
                          of a best-seller list is the point of showing it. */}
                      <span
                        aria-hidden
                        className="mt-1 block h-1.5 rounded-full bg-brand"
                        style={{ width: `${Math.round((one.qty / mostQty) * 100)}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-bold">×{one.qty}</span>
                      <span className="hint block">{naira(one.spend)}</span>
                    </span>
                  </div>
                ))}
              </div>

              {numbers.byMonth.length > 1 && (
                <div className="card">
                  <p className="ticket text-muted">Month by month</p>
                  {numbers.byMonth.map((one) => (
                    <div
                      key={one.month}
                      className="flex items-center gap-3 border-t-[1.5px] border-rule py-2.5"
                    >
                      <span className="w-20 shrink-0 text-sm font-semibold">
                        {new Date(`${one.month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          aria-hidden
                          className="block h-1.5 rounded-full bg-ink"
                          style={{ width: `${Math.round((one.spend / mostMonth) * 100)}%` }}
                        />
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold">{naira(one.spend)}</span>
                        <span className="hint block">
                          {one.orders} {one.orders === 1 ? "order" : "orders"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
