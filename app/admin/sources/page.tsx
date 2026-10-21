import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { sourceNumbers, sourcesForPicker } from "@/lib/sources";
import ActionButton from "@/components/ActionButton";

export const dynamic = "force-dynamic";

const RANGES = [0, 28, 90] as const;
const RANGE_WORD: Record<number, string> = {
  0: "All time",
  28: "28 days",
  90: "90 days",
};

/**
 * One source, in the numbers that source would be judged on.
 *
 * "Source" rather than "who brought them", because most of these did not
 * bring anybody. A promoter brings somebody and is owed for it; ChatGPT
 * recommended a shop to somebody who then rang it, which is where she
 * found us rather than something it did for us. One word has to cover a
 * person and a place, and that word is where they came from.
 *
 * The analytics page answers a different question and was being asked this
 * one. It counts visits off the web, and somebody recommended by ChatGPT
 * who then rang the shop and had her order typed in leaves no web trail at
 * all. The only record of it is what she said and what somebody wrote on
 * her customer page.
 *
 * A picker rather than a flat table, because a table of every source at
 * once answers "which is biggest" and nothing else. The question anybody
 * arrives with is about one of them: who did ChatGPT bring, did they
 * order, what were they worth. And a tagged customer who has never ordered
 * is a real and useful answer rather than a number to hide, so the two
 * counts are kept apart and the people are named underneath.
 */
export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; days?: string }>;
}) {
  const asked = await searchParams;
  const sources = await sourcesForPicker();

  const days = RANGES.includes(Number(asked.days) as (typeof RANGES)[number])
    ? Number(asked.days)
    : 0;
  // The first one unless named, so the page is never a picker standing on
  // its own with nothing under it.
  const chosen = sources.find((one) => one.key === asked.from) ?? sources[0] ?? null;
  const numbers = chosen ? await sourceNumbers(chosen.key, days) : null;

  const on = (iso: string | null) =>
    iso === null
      ? "—"
      : new Date(iso).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

  return (
    <div className="space-y-[18px]">
      <PageHeader
        title="Sources"
        detail="Where the customers came from, and what each of those has been worth."
        backHref="/admin/customers"
        backLabel="Customers"
        actions={
          <span className="flex flex-wrap gap-1.5">
            {RANGES.map((range) => (
              <Link
                key={range}
                href={`/admin/sources?from=${encodeURIComponent(
                  chosen?.key ?? ""
                )}&days=${range}`}
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

      {sources.length === 0 ? (
        <p className="card text-sm text-muted">
          Nobody has a source on them yet. Open a customer and set one under
          &quot;Who brought them&quot;, and they will gather here.
        </p>
      ) : (
        <>
          {/* A plain form rather than anything clever: picking one reloads
              the page with it named in the address, so it can be bookmarked
              and sent. */}
          <form method="get" className="card flex flex-wrap items-end gap-3">
            <input type="hidden" name="days" value={String(days)} />
            <div className="min-w-[220px] flex-1">
              <label className="label" htmlFor="from">
                Source
              </label>
              <select id="from" name="from" defaultValue={chosen?.key ?? ""} className="field">
                {sources.map((one) => (
                  <option key={one.key} value={one.key}>
                    {one.label}
                    {one.kind === "promoter" ? " (promoter)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <ActionButton className="btn-admin-go" busy="Looking…" done="Shown ✓">
              Show
            </ActionButton>
          </form>

          {numbers === null ? (
            <p className="card text-sm text-muted">
              Nobody is filed under {chosen?.label ?? "this"} any more.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                {/* Brought and ordered are two numbers on purpose. A place
                    that introduces ten people and sells to none is doing
                    something, and it is not this: saying "10" on its own
                    would be the page flattering it. */}
                <Stat
                  label="People from it"
                  value={numbers.customers}
                  hint="Filed under it, ordered or not"
                />
                <Stat
                  label="Who ordered"
                  value={numbers.ordered}
                  hint={days > 0 ? `In the last ${days} days` : "Ever"}
                />
                <Stat label="They paid" value={numbers.money} money tone="good" />
                <Stat
                  label="Profit"
                  value={numbers.profit}
                  money
                  tone="good"
                  hint={numbers.estimated ? "A run has no costs in yet" : "Their share of the runs"}
                />
              </div>

              <div className="card">
                <p className="ticket text-muted">What it has done</p>
                <p className="mt-1 text-[15px] leading-[1.5]">
                  <strong>
                    {numbers.customers} {numbers.customers === 1 ? "person" : "people"}
                  </strong>{" "}
                  {numbers.customers === 1 ? "came" : "came"} to us through {chosen?.label}.{" "}
                  {numbers.ordered === 0 ? (
                    <>
                      None of them has ordered{days > 0 ? ` in the last ${days} days` : " yet"},
                      which is worth knowing on its own: it has sent somebody and not yet
                      sold anything.
                    </>
                  ) : (
                    <>
                      <strong>{numbers.ordered}</strong> of them{" "}
                      {numbers.ordered === 1 ? "has" : "have"} ordered, {numbers.paid}{" "}
                      {numbers.paid === 1 ? "order" : "orders"} paid for, worth{" "}
                      <strong>{naira(numbers.money)}</strong> and{" "}
                      <strong>
                        {naira(numbers.profit)}
                        {numbers.estimated ? "*" : ""}
                      </strong>{" "}
                      of profit. First on <strong>{on(numbers.firstAt)}</strong>, most recently{" "}
                      <strong>{on(numbers.lastAt)}</strong>.
                    </>
                  )}
                </p>
                <p className="hint mt-2 leading-[1.5]">
                  Counted off what somebody was told and wrote down, not off the web. Profit
                  is a share rather than a measurement: one car carries one tank of fuel for
                  everything on it, so each run&apos;s profit is split across its orders by what
                  each was worth. A star means a run in there has no costs typed in yet.
                </p>
              </div>

              <div className="card">
                <p className="ticket text-muted">Who they are</p>
                {numbers.people.map((one) => (
                  <div
                    key={one.phone}
                    className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 border-t-[1.5px] border-rule py-2.5"
                  >
                    <Link
                      href={`/admin/customers/${encodeURIComponent(one.phone)}`}
                      className="text-sm font-bold text-ink underline"
                    >
                      {one.name || formatPhone(one.phone)}
                    </Link>
                    <span className="hint">
                      {one.orders === 0
                        ? "Has not ordered"
                        : `${one.orders} order${one.orders === 1 ? "" : "s"} · ${naira(one.spend)}`}
                    </span>
                    <span className="ml-auto hint">{one.lastAt ? on(one.lastAt) : ""}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
