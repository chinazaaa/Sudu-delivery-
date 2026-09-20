import { lagosToday } from "@/lib/time";
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
import { nextArrival, runArrival } from "@/lib/arrival";
import { offersByRestaurant } from "@/lib/coupons";
import { dropLabel, nextDrop, skincareOn, skincareShop } from "@/lib/skincare";
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
      // When something ordered right now would land, by the one rule every
      // other way of ordering uses: a run going today while it is taking
      // orders, a car of its own today, a run tomorrow, tomorrow's first
      // window. Worked out here so the clock is the shop's.
      arriving={
        nextArrival(
          batches
            .map(toBatchView)
            .filter((one) => !one.closed && !one.full)
            .map(runArrival),
          slots,
          lagosToday()
        )?.said ?? ""
      }
      promos={promos}
      // One car a week, on a Saturday. Empty when that shelf is off, and then
      // the page does not mention it at all.
      skincare={
        skincareOn(settings) && (await skincareShop())
          ? `Order any day. It comes ${dropLabel(nextDrop(settings).date)}.`
          : ""
      }
    />
  );
}
