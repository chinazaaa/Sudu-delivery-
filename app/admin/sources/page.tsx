import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Empty from "@/components/Empty";
import { sourceLines } from "@/lib/sources";
import { naira } from "@/lib/money";
import { runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Who and what brought the customers, and what each of them is worth.
 *
 * The analytics page answers a different question and was being asked this
 * one. It counts visits off the web: referrers, utm tags, page views. A
 * customer who was recommended by ChatGPT, rang the shop on the phone and
 * had her order typed in by hand leaves no web trail at all, so analytics
 * can never know ChatGPT brought her. The only record of it is what she
 * said and what somebody wrote down on her customer page, and that is what
 * this reads.
 *
 * So the unit here is a person rather than a visit, and the money is every
 * order they have ever placed, because whoever introduced somebody is
 * still the reason for their fourth order.
 *
 * Promoters and places sit in one table deliberately. Both are ways of
 * spending to be introduced to somebody, one in commission and one in
 * time, and the only way to know which is working is to read them side by
 * side.
 */
export default async function SourcesPage() {
  const lines = await sourceLines();

  const people = lines.reduce((sum, one) => sum + one.customers, 0);
  const money = lines.reduce((sum, one) => sum + one.money, 0);
  const profit = lines.reduce((sum, one) => sum + one.profit, 0);
  const guessed = lines.some((one) => one.estimated);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Who brought them"
        detail="Every customer, under whoever or whatever introduced them, and what that has been worth since."
        backHref="/admin/more"
        backLabel="More"
      />

      {lines.length === 0 ? (
        <Empty icon="cart" title="Nobody yet" href="/admin/customers" action="Open the customers">
          Set a promoter or a place on a customer and they will gather here.
        </Empty>
      ) : (
        <>
          <section className="card space-y-1 p-3.5 sm:p-4">
            <p className="text-sm font-bold">
              {people} customer{people === 1 ? "" : "s"} · {naira(money)} ordered ·{" "}
              {naira(profit)} profit{guessed ? "*" : ""}
            </p>
            <p className="hint">
              Counted off what somebody was told and wrote down, not off the
              web. A customer who heard about us from a friend, or from
              ChatGPT, and then rang up leaves no trail anywhere else.
            </p>
          </section>

          <section className="card space-y-2 p-3.5 sm:p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-semibold">From</th>
                    <th className="py-2 pr-3 text-right font-semibold">People</th>
                    <th className="py-2 pr-3 text-right font-semibold">Ordered</th>
                    <th className="py-2 pr-3 text-right font-semibold">Orders</th>
                    <th className="py-2 pr-3 text-right font-semibold">Money</th>
                    <th className="py-2 text-right font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {lines.map((one) => (
                    <tr key={one.key || "none"}>
                      <td className="py-2 pr-3">
                        <span className="block font-medium">{one.label}</span>
                        <span className="hint block">
                          {one.kind === "promoter"
                            ? "A person, who earns on it"
                            : one.kind === "channel"
                              ? "A place"
                              : "Nobody has said"}
                          {one.lastOrder
                            ? ` · last ${runDateLabel(one.lastOrder.slice(0, 10))}`
                            : ""}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right">{one.customers || "-"}</td>
                      {/* How many of them ever came back with money. A place
                          that introduces twenty people and sells to none is
                          doing something, and it is not this. */}
                      <td className="py-2 pr-3 text-right">{one.ordered || "-"}</td>
                      <td className="py-2 pr-3 text-right">{one.paid || "-"}</td>
                      <td className="py-2 pr-3 text-right">
                        {one.money > 0 ? naira(one.money) : "-"}
                      </td>
                      <td className="py-2 text-right font-semibold">
                        {one.money > 0 ? `${naira(one.profit)}${one.estimated ? "*" : ""}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="hint">
              Set this on anybody from their own page, under{" "}
              <Link href="/admin/customers" className="font-semibold underline">
                Who brought them
              </Link>
              . A promoter wins over a place where there is both, because a
              promoter is owed on it.
            </p>
            <p className="hint">
              Profit is a share rather than a measurement. One car carries one
              tank of fuel and one driver for everything on it, so each run&apos;s
              profit is split across its orders by what each was worth. A star
              means a run in there has no costs typed in yet, so that figure is
              the best case rather than the figure.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
