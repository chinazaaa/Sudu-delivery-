import Link from "next/link";
import Diagnostic from "@/components/Diagnostic";
import { batchOverview } from "@/lib/admin";
import { diagnoseEmpty, keyKind } from "@/lib/health";
import { ensureUpcomingBatches, closeExpiredBatches } from "@/lib/batches";
import { BATCH_MINIMUM, SLOT_LABEL } from "@/lib/config";
import { clockLabel, runDateLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  let problem: Awaited<ReturnType<typeof diagnoseEmpty>> | null = null;
  let batches: Awaited<ReturnType<typeof batchOverview>> = [];

  try {
    await ensureUpcomingBatches();
    await closeExpiredBatches();
    batches = await batchOverview();
    if (batches.length === 0) problem = await diagnoseEmpty();
  } catch (error) {
    // A blocked write usually means the wrong key, so say that rather than
    // repeating a Postgres permission message at someone deploying a site.
    problem =
      keyKind() === "public"
        ? await diagnoseEmpty()
        : {
            ok: false,
            title: "Could not reach the database",
            detail: error instanceof Error ? error.message : String(error),
          };
  }

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

      {problem && !problem.ok && (
        <Diagnostic title={problem.title} detail={problem.detail} />
      )}
    </div>
  );
}
