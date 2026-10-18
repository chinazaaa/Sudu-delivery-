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
import { clockOf } from "@/lib/same-day";
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

  return (
    <>
      <ShelfCheckout
        counter="pharmacy"
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
      />
      <HelpLine number={settings.whatsapp_number} about="a pharmacy order" />
    </>
  );
}
