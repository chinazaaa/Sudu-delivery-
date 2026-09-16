import { cookies } from "next/headers";
import OrderForm from "@/components/OrderForm";
import { openBatches, recentlyClosedBatch } from "@/lib/batches";
import { existingLoad } from "@/lib/orders";
import { normalisePhone } from "@/lib/phone";
import { menuView } from "@/lib/menu";
import { activePromoter } from "@/lib/promoters";
import { getSettings } from "@/lib/settings";
import { toBatchView, toClosedBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; batch?: string; phone?: string }>;
}) {
  const params = await searchParams;
  // The proxy sets the ref cookie on *this* response, so it is not readable
  // until the next request, so the code has to come off the URL on the way in.
  const ref = params.ref ?? (await cookies()).get("sudu_ref")?.value;

  const [menu, batches, promoter, justClosed, settings] = await Promise.all([
    menuView(),
    openBatches(),
    activePromoter(ref),
    recentlyClosedBatch(),
    getSettings(),
  ]);

  const views = [
    ...(justClosed ? [toClosedBatchView(justClosed)] : []),
    ...batches.map(toBatchView),
  ];

  // Arriving from "add to my order": the same phone and batch, so only the
  // difference in delivery is charged (addendum §3).
  const phone = normalisePhone(params.phone ?? "");
  const adding =
    phone && params.batch && views.some((v) => v.id === params.batch)
      ? { ...(await existingLoad(params.batch, phone)), phone, batchId: params.batch }
      : null;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          KFC and Domino&apos;s, delivered to PAU.
        </h1>
        <p className="mt-1 text-ink/70">{settings.pitch_line}</p>
      </section>

      <OrderForm
        menu={menu}
        batches={views}
        promoter={promoter}
        adding={
          adding && adding.items > 0
            ? {
                batchId: adding.batchId,
                phone: adding.phone,
                name: adding.orders[0]?.customer_name ?? "",
                hostel: adding.orders[0]?.hostel ?? "",
                items: adding.items,
                feeCharged: adding.feeCharged,
              }
            : null
        }
      />
    </div>
  );
}
