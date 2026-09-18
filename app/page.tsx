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
  deliveryHours,
} from "@/lib/settings";
import { toBatchView } from "@/lib/view";
import { deliverySlots } from "@/lib/same-day";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [menu, batches, slides, settings, popularIds, bands] = await Promise.all([
    menuView(),
    openBatches(),
    listSlides(),
    safeSettings(),
    popularItemIds(),
    activeBands(),
  ]);
  const slots = settings.same_day_on === "on" ? deliverySlots(new Date(), await deliveryHours()) : [];

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
    />
  );
}
