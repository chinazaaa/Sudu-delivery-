import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { listSlides } from "@/lib/slides";
import { popularItemIds } from "@/lib/popular";
import {
  activeBands,
  AUTO_HEADLINE,
  AUTO_LINES,
  safeSettings,
  hoursByDay,
} from "@/lib/settings";
import { toBatchView } from "@/lib/view";
import { deliverySlots, slotsWorthOffering } from "@/lib/same-day";
import { offersByRestaurant } from "@/lib/coupons";
import { offerBadge } from "@/lib/offers";
import { sweepGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Somebody opening the site is enough to close a group whose time is up, so
  // a car does not sit open because everybody in it put their phone away.
  sweepGroups();

  const [menu, batches, slides, settings, popularIds, bands] = await Promise.all([
    menuView(),
    openBatches(),
    listSlides(),
    safeSettings(),
    popularItemIds(),
    activeBands(),
  ]);
  // An offer says itself on the card of the restaurant it belongs to. The
  // home page has enough on it without a strip for every deal.
  const offers = await offersByRestaurant();
  const promos = Object.fromEntries(
    [...offers.entries()].map(([id, offer]) => [id, offerBadge(offer)])
  );

  const slots =
    settings.same_day_on === "on"
      ? slotsWorthOffering(
          deliverySlots(new Date(), await hoursByDay()),
          batches.map((one) => ({ run_date: one.run_date, window: one.delivery_window_text }))
        )
      : [];

  const lines = (settings.auto_lines || AUTO_LINES)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <Home
      menu={menu}
      slides={slides}
      popularIds={popularIds}
      autoHeadline={settings.auto_headline || AUTO_HEADLINE}
      autoLines={lines.length > 0 ? lines : [""]}
      bands={bands}
      nextRun={batches.length > 0 ? toBatchView(batches[0]) : null}
      // The soonest time we can actually hit, from the shop's clock rather
      // than the phone's, and only when same day is switched on today.
      soonest={slots[0] ?? null}
      promos={promos}
    />
  );
}
