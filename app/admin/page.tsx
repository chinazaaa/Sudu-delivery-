import Link from "next/link";
import { batchOverview } from "@/lib/admin";
import { ensureUpcomingBatches, closeExpiredBatches } from "@/lib/batches";
import { BATCH_MINIMUM, SLOT_LABEL } from "@/lib/config";
import { clockLabel, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await ensureUpcomingBatches();
  await closeExpiredBatches();
  const batches = await batchOverview();

  const thisWeek = batches.filter((b) => b.status !== "cancelled");
  const weekTotal = thisWeek.reduce((total, b) => total + b.orderCount, 0);

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">Runs</h1>
        <p className="text-sm text-ink/60">
          {weekTotal} order{weekTotal === 1 ? "" : "s"} across the batches below.
          Minimum is {BATCH_MINIMUM} per batch.
        </p>
      </section>

      <ul className="space-y-2">
        {batches.map((batch) => {
          const short = batch.paidCount < BATCH_MINIMUM;
          return (
            <li key={batch.id}>
              <Link
                href={`/admin/batch/${batch.id}`}
                className="card flex items-center justify-between hover:border-brand"
              >
                <div>
                  <p className="font-medium">
                    {runDateLabel(batch.run_date)} · {SLOT_LABEL[batch.slot]}
                  </p>
                  <p className="text-sm text-ink/60">
                    Cut-off {clockLabel(batch.cut_off_at)} · {batch.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${short ? "text-brand" : "text-green-700"}`}>
                    {batch.paidCount}/{BATCH_MINIMUM}
                  </p>
                  <p className="text-xs text-ink/50">
                    {batch.orderCount - batch.paidCount} unpaid
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {batches.length === 0 && (
        <p className="text-sm text-ink/60">No batches yet.</p>
      )}
    </div>
  );
}
