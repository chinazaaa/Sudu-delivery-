import { cookies } from "next/headers";
import OrderForm from "@/components/OrderForm";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { activePromoter } from "@/lib/promoters";
import { clockLabel, runDateLabel, weekdayLabel } from "@/lib/time";
import { SLOT_LABEL } from "@/lib/config";
import type { BatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // The proxy sets the ref cookie on *this* response, so it is not readable
  // until the next request — the code has to come off the URL on the way in.
  const ref = (await searchParams).ref ?? (await cookies()).get("sudu_ref")?.value;

  const [menu, batches, promoter] = await Promise.all([
    menuView(),
    openBatches(),
    activePromoter(ref),
  ]);

  const views: BatchView[] = batches.map((batch) => ({
    id: batch.id,
    label: `${weekdayLabel(batch.run_date)} ${SLOT_LABEL[batch.slot]}`,
    cutOffISO: batch.cut_off_at,
    cutOffLabel: `${runDateLabel(batch.run_date)}, ${clockLabel(batch.cut_off_at)}`,
    deliveryWindow: batch.delivery_window_text,
    full: batch.full,
  }));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          KFC and Domino&apos;s, delivered to PAU.
        </h1>
        <p className="mt-1 text-ink/70">
          One price covering food and delivery, paid once, before the run. Mix
          restaurants in one order.
        </p>
      </section>

      <OrderForm menu={menu} batches={views} promoter={promoter} />
    </div>
  );
}
