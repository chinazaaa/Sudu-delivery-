import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import DealPush from "@/components/admin/DealPush";
import { menuView } from "@/lib/menu";
import { dealAudience } from "@/lib/push";
import { liveOccasions } from "@/lib/boxes";
import { listCheckoutLinks } from "@/lib/checkout-links";
import { skincareOn } from "@/lib/skincare";
import { safeSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Telling everybody something worth knowing.
 *
 * News about an order goes out on its own, because it is about food somebody
 * has already paid for. This page is for the other kind: a deal at a
 * restaurant, cheaper delivery tonight, a code worth using. Everyone here has
 * left the switch on, and can turn it off in the app.
 */
export default async function NotificationsPage() {
  const [menu, audience, occasions, links, settings] = await Promise.all([
    menuView(),
    dealAudience(),
    liveOccasions(),
    listCheckoutLinks().catch(() => []),
    safeSettings(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        detail="A deal, an offer, a code. It goes to phones with the app, and lands wherever you point it."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Phones it would reach" value={String(audience)} />
        <Stat label="Order news" value="Sent on its own" />
      </div>

      <DealPush
        restaurants={menu.map((place) => ({
          id: place.restaurant.id,
          name: place.restaurant.name,
          categories: place.categories,
        }))}
        occasions={occasions.map((one) => ({ slug: one.slug, name: one.name }))}
        links={links
          .filter((one) => one.active && one.short)
          .slice(0, 20)
          .map((one) => ({ short: one.short as string, label: one.label }))}
        skincare={skincareOn(settings)}
      />
    </div>
  );
}
