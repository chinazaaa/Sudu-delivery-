import { notFound } from "next/navigation";
import { safeSettings } from "@/lib/settings";
import { dropLabel, nextDrop, skincareBands, skincareOn, skincareShop } from "@/lib/skincare";
import { hostelNames } from "@/lib/hostels";
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
    <ShelfCheckout
      bands={skincareBands(settings)}
      when={dropLabel(drop.date)}
      window={settings.skincare_window}
      cutOff={clockOf(hour, minute)}
      hostels={await hostelNames()}
      me={signedIn ? await customerDetails(signedIn) : null}
    />
  );
}
