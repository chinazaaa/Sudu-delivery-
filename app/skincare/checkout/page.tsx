import { notFound } from "next/navigation";
import HelpLine from "@/components/HelpLine";
import { safeSettings } from "@/lib/settings";
import { dropLabel, nextDrop, skincareBands, skincareOn, skincarePromise, skincareShop } from "@/lib/skincare";
import { hostelNames } from "@/lib/hostels";
import { namedPromoters } from "@/lib/promoters";
import { SYMBOL, moniesOn, rateFor } from "@/lib/abroad";
import { currentCustomer, customerDetails } from "@/lib/customer-auth";
import { clockOf } from "@/lib/same-day";
import { cutOffTime } from "@/lib/skincare";
import ShelfCheckout from "@/components/ShelfCheckout";

export const dynamic = "force-dynamic";

export default async function SkincareCheckoutPage() {
  const settings = await safeSettings();
  const shop = await skincareShop();
  if (!skincareOn(settings) || !shop) notFound();

  const drop = nextDrop(settings);
  const [hour, minute] = cutOffTime(settings.skincare_cut_off);
  const signedIn = await currentCustomer();

  return (
    <>
      <ShelfCheckout
      bands={skincareBands(settings)}
      when={dropLabel(drop.date)}
      window={settings.skincare_window}
      cutOff={clockOf(hour, minute)}
      promise={skincarePromise(settings)}
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
      <HelpLine number={settings.whatsapp_number} about="a skincare order" />
    </>
  );
}
