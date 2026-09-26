import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import { repeatingOrders } from "@/lib/order-edit";
import { repeatSaid } from "@/lib/box-day";
import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { orderAgain } from "../actions";

export const dynamic = "force-dynamic";

/**
 * Everybody who asked for it again.
 *
 * Not a subscription: nothing charges itself, and on a shop where a box is
 * sourced by hand nothing should. This is the list of people who said "every
 * month", so that when the month comes round somebody knows whose door to
 * knock on, and can raise the next order from here in one press.
 *
 * Grouped by how often, because that is the only question being asked of the
 * page: who is due.
 */
export default async function SubscriptionsPage() {
  const all = await repeatingOrders();

  const groups = [
    { key: "weekly", label: "Every week" },
    { key: "fortnightly", label: "Every two weeks" },
    { key: "monthly", label: "Every month" },
  ].map((one) => ({ ...one, rows: all.filter((row) => row.every === one.key) }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Repeats"
        detail="People who asked for it again. Nothing charges itself: raise the next one here and send them the link."
      />

      {all.length === 0 ? (
        <p className="card text-sm text-muted">
          Nobody has asked for a repeat yet. The tick is on the box form, under
          the day.
        </p>
      ) : (
        <div className="space-y-5">
          {groups
            .filter((group) => group.rows.length > 0)
            .map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="font-extrabold">
                  {group.label}{" "}
                  <span className="font-semibold text-muted">
                    · {group.rows.length}
                  </span>
                </h2>

                {group.rows.map((row) => (
                  <article key={row.id} className="card space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <Link
                          href={`/admin/orders/${row.id}`}
                          className="font-bold text-brand"
                        >
                          {row.ref} · {row.name}
                        </Link>
                        <p className="text-sm text-muted">
                          {formatPhone(row.phone)} · {row.hostel}
                          {row.note ? ` · ${row.note}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-extrabold">
                        {naira(row.total)}
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      {repeatSaid(row.every)} · last one{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Africa/Lagos",
                        day: "numeric",
                        month: "short",
                      }).format(new Date(row.placedOn))}
                      {row.status === "pending" ? " · not paid yet" : ""}
                    </p>

                    {/* Copies what the order finally became, not what was
                        first ordered: six weeks of changes agreed on
                        WhatsApp are in it. */}
                    <form
                      action={orderAgain}
                      className="flex flex-wrap items-end gap-2 border-t border-black/5 pt-2"
                    >
                      <input type="hidden" name="order_id" value={row.id} />
                      <label className="text-xs font-semibold text-muted">
                        Next one going on
                        <input
                          type="date"
                          name="run_date"
                          className="field mt-0.5 w-44 py-1.5 text-sm"
                        />
                      </label>
                      <button className="btn-primary px-4 py-2 text-sm">
                        Raise the next one
                      </button>
                    </form>
                  </article>
                ))}
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
