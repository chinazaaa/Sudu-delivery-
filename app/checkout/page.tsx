import { cookies } from "next/headers";
import {
  activeBands,
  deliveryHours,
  safeSettings,
  sameDayPricing,
} from "@/lib/settings";
import { hostelNames } from "@/lib/hostels";
import Checkout, { type AddingTo } from "@/components/Checkout";
import { openBatches, recentlyClosedBatch } from "@/lib/batches";
import { existingLoad } from "@/lib/orders";
import { deliverySlots } from "@/lib/same-day";
import { normalisePhone } from "@/lib/phone";
import { toBatchView, toClosedBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; phone?: string }>;
}) {
  const params = await searchParams;

  const [batches, justClosed] = await Promise.all([
    openBatches(),
    recentlyClosedBatch(),
  ]);

  // The next few runs only. A month of Fridays is a wall, not a choice.
  const views = [
    ...(justClosed ? [toClosedBatchView(justClosed)] : []),
    ...batches.slice(0, 4).map(toBatchView),
  ];

  // Arriving from "add to my order": same phone, same batch, so only the
  // difference in delivery is charged.
  const phone = normalisePhone(params.phone ?? "");
  const target = params.batch && views.find((v) => v.id === params.batch && !v.closed);
  let adding: AddingTo | null = null;

  if (phone && target) {
    const load = await existingLoad(target.id, phone);
    if (load.items > 0) {
      adding = {
        batchId: target.id,
        batchLabel: target.label,
        phone,
        name: load.orders[0]?.customer_name ?? "",
        hostel: load.orders[0]?.hostel ?? "",
        items: load.items,
        feeCharged: load.feeCharged,
      };
    }
  }

  return (
    <Checkout
      batches={views}
      adding={adding}
      // Worked out here so the clock is the shop's, not whatever the phone
      // says, and so a page left open all morning cannot offer a time that
      // has already gone.
      sameDaySlots={
        (await safeSettings()).same_day_on === "on"
          ? deliverySlots(new Date(), await deliveryHours())
          : []
      }
      sameDayBands={(await sameDayPricing()).bands}
      urgentExtra={(await sameDayPricing()).urgentExtra}
      bands={await activeBands()}
      hostels={await hostelNames()}
    />
  );
}
