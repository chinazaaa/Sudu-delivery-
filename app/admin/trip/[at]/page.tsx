import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import { tripSheet } from "@/lib/admin";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/**
 * One same day trip, however many cars were asked for.
 *
 * Each car is its own batch, because each was one person asking. Whoever is
 * buying the food does not make ten trips to Chicken Republic, so the counter
 * list is added up across all of them here. The individual runs keep their own
 * pages for costs and profit.
 */
export default async function TripPage({
  params,
}: {
  params: Promise<{ at: string }>;
}) {
  const at = decodeURIComponent((await params).at);
  const sheet = await tripSheet(at);
  if (!sheet) notFound();

  return (
    <div>
      <PageHeader
        title={sheet.label || "Same day trip"}
        detail="Everything asked for at this time, as one shopping trip."
        actions={
          <Link href="/admin/runs" className="btn-quiet px-4 py-2.5 text-sm">
            Back to runs
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Orders" value={sheet.handout.length} />
        <Stat label="Items" value={sheet.items} />
        <Stat label="Taken" value={sheet.gross} money tone="good" />
        <Stat
          label="Not paid"
          value={sheet.unpaid.length}
          tone={sheet.unpaid.length > 0 ? "warn" : undefined}
        />
      </div>

      <section className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">What to buy</h2>
          <p className="text-sm text-muted">
            Added up across every car going at this time. Unpaid orders are not on
            it, because their food is not bought.
          </p>
        </div>

        {sheet.counter.length === 0 ? (
          <p className="text-sm text-muted">Nothing paid for yet.</p>
        ) : (
          sheet.counter.map((place) => (
            <div key={place.restaurant} className="rounded-2xl border border-black/10 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold">{place.restaurant}</h3>
                <span className="text-sm font-semibold">
                  {naira(place.expectedFoodTotal)}
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {place.lines.map((line, index) => (
                  <li key={`${place.restaurant}-${index}`} className="flex gap-2">
                    <span className="font-bold text-brand">{line.qty}×</span>
                    <span>
                      {line.name}
                      {line.choices.length > 0 && (
                        <span className="text-muted"> · {line.choices.join(", ")}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="card mb-4 space-y-3">
        <div>
          <h2 className="font-bold">Bags</h2>
          <p className="text-sm text-muted">
            Who gets what. Marking them delivered still happens on each run&apos;s
            own page, which is also where its fuel and profit live.
          </p>
        </div>
        <ul className="space-y-2">
          {sheet.handout.map((order) => (
            <li key={order.id} className="rounded-2xl border border-black/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-bold">
                  {order.for_name ?? order.customer_name}
                </span>
                <span className="text-sm text-muted">
                  {order.hostel} · {formatPhone(order.customer_phone)}
                </span>
              </div>
              <ul className="mt-1 text-sm text-ink/80">
                {order.lines.map((line) => (
                  <li key={line.id}>
                    {line.qty}× {line.name}
                    {line.choices.length > 0 && (
                      <span className="text-muted"> · {line.choices.join(", ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {sheet.unpaid.length > 0 && (
        <section className="card space-y-2">
          <h2 className="font-bold">Not paid, not travelling</h2>
          <ul className="space-y-1 text-sm">
            {sheet.unpaid.map((order) => (
              <li key={order.id} className="flex justify-between gap-3">
                <span>
                  {order.for_name ?? order.customer_name} ·{" "}
                  {formatPhone(order.customer_phone)}
                </span>
                <span className="font-semibold">{naira(order.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
