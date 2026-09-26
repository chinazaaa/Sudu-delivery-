import { lagosToday } from "@/lib/time";
import HelpLine from "@/components/HelpLine";
import { cookies } from "next/headers";
import {
  activeBands,
  hoursByDay,
  safeSettings,
  sameDayPricing,
} from "@/lib/settings";
import { liveOffers } from "@/lib/coupons";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import Checkout, { type AddingTo } from "@/components/Checkout";
import { openBatches, recentlyClosedBatch } from "@/lib/batches";
import { existingLoad } from "@/lib/orders";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { normalisePhone } from "@/lib/phone";
import { allAreas, areaOfEach, valueBandsOfEach } from "@/lib/areas-server";
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

  // Every run that is open, not the next few. Which of them can carry this
  // cart depends on where its restaurants are, and only the browser knows
  // what is in the cart, so cutting the list here cut off the Saturday run
  // that was the one going to Lekki: the checkout said no run was going
  // there while it sat fifth in a list of four. The page keeps the list
  // short itself, out of the ones that can actually carry the order.
  const views = [
    ...(justClosed ? [toClosedBatchView(justClosed)] : []),
    ...batches.map(toBatchView),
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

  // Somebody abroad paying by card, where the shop has switched it on and
  // set a rate it will honour. Worked out here so the checkout is handed
  // figures rather than settings.
  const settings = await safeSettings();
  const monies = moniesOn(settings).map((code) => ({
    code,
    label: code === "GBP" ? "Pounds" : "Dollars",
    symbol: SYMBOL[code],
    rate: rateFor(settings, code),
  }));

  return (
    <>
      <Checkout
      monies={monies}
      batches={views}
      today={lagosToday()}
      adding={adding}
      // Worked out here so the clock is the shop's, not whatever the phone
      // says, and so a page left open all morning cannot offer a time that
      // has already gone.
      sameDaySlots={
        (await safeSettings()).same_day_on === "on"
          ? slotsWorthOffering(
              deliverySlots(new Date(), await hoursByDay()),
              // A window a run already covers is not offered: the run gets
              // there at the same hour for two and a half thousand less.
              batches.map((one) => ({
                run_date: one.run_date,
                window: one.delivery_window_text,
              }))
            )
          : []
      }
      sameDayBands={(await sameDayPricing()).bands}
      urgentExtra={(await sameDayPricing()).urgentExtra}
      bands={await activeBands()}
      // Where each kitchen is, and what that adds. The checkout prices by the
      // furthest thing in the cart, which is the same rule the server charges
      // by, so the number on this page is the number on the bill.
      areas={await allAreas()}
      areaOf={await areaOfEach()}
      // The kitchens that charge by what the shopping comes to rather than
      // by how many things it is. A market trip is one trip and two bags.
      valueBandsOf={await valueBandsOfEach()}
      // The promotions on today, with their rules, so the checkout quotes the
      // price it is about to charge rather than the ladder it is replacing.
      offers={await liveOffers()}
      hostels={await hostelNames()}
      // Asked on the one form a first order has to pass through. Whoever
      // they name is theirs for life, so there is no second chance at it.
      promoters={await namedPromoters()}
      />
      {/* Every page somebody can get stuck on has the same way out, so
          nothing needs a paragraph explaining itself: if it is not clear,
          they message us and we answer. */}
      <HelpLine number={settings.whatsapp_number} about="my order" page="Checkout" />
    </>
  );
}
