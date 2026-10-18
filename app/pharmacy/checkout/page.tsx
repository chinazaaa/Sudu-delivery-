import { notFound } from "next/navigation";
import HelpLine from "@/components/HelpLine";
import { safeSettings } from "@/lib/settings";
import {
  cutOffTime,
  dropLabel,
  nextDrop,
  pharmacyBands,
  pharmacyCutOff,
  pharmacyOn,
  pharmacyPromise,
  pharmacyShop,
} from "@/lib/pharmacy";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { clockOf, deliverySlots } from "@/lib/same-day";
import { hoursByDay, sameDayPricing } from "@/lib/settings";
import ShelfCheckout from "@/components/ShelfCheckout";

export const dynamic = "force-dynamic";

/**
 * Paying for a pharmacy basket.
 *
 * The same checkout as the skincare shelf, with the one thing this counter
 * cannot leave to a page somebody may never have opened. The caution is
 * printed where the money changes hands, because that is the moment a
 * person is deciding, and a disclaimer they have to go looking for is a
 * disclaimer written for us rather than for them.
 */
export default async function PharmacyCheckoutPage() {
  const settings = await safeSettings();
  const shop = await pharmacyShop();
  if (!pharmacyOn(settings) || !shop) notFound();

  const drop = nextDrop(settings);
  const [hour, minute] = cutOffTime(pharmacyCutOff(settings));
  const signedIn = await currentCustomer();

  /*
   * The other way, where there is one.
   *
   * Today and tomorrow, not today alone. Deliveries finish in the evening,
   * so somebody with a fever at nine at night has nothing left today, and
   * offering them only the weekly car is answering "I need this now" with
   * "Saturday". Tomorrow afternoon is a far better answer and it is a trip
   * we were going to be able to make anyway.
   *
   * Nothing further out than that: past tomorrow the weekly car is close
   * enough that a dearer trip of its own stops being worth offering.
   */
  const soon =
    settings.same_day_on === "on"
      ? deliverySlots(new Date(), await hoursByDay()).filter(
          (one) => one.day === "today" || one.day === "tomorrow"
        )
      : [];
  const sameDay = await sameDayPricing();

  return (
    <>
      <ShelfCheckout
        counter="pharmacy"
        href="/pharmacy"
        drawing="medicine"
        bands={pharmacyBands(settings)}
        when={dropLabel(drop.date)}
        window={settings.pharmacy_window}
        cutOff={clockOf(hour, minute)}
        promise={pharmacyPromise(settings)}
        caution={
          "We are not a pharmacy and nobody here is a pharmacist. We buy what " +
          "you have named, over the counter, and carry it to you sealed. We " +
          "cannot advise on what to take or how much, and we do not carry " +
          "prescription only medicine. Check the product, the seal and the " +
          "expiry date before the rider leaves: after that it cannot come back."
        }
        hostels={await hostelNames()}
        promoters={(await namedPromoters().catch(() => [])).map((one) => ({
          code: one.code,
          name: one.name,
        }))}
        monies={moniesOn(settings).map((code) => ({
          code,
          label: code === "GBP" ? "Pounds" : "Dollars",
          symbol: SYMBOL[code],
          rate: rateFor(settings, code),
        }))}
        me={signedIn ? await customerDetails(signedIn) : null}
        slots={soon}
        sameDayBands={sameDay.bands}
        urgentExtra={sameDay.urgentExtra}
      />
      <HelpLine number={settings.whatsapp_number} about="a pharmacy order" />
    </>
  );
}
