import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { listSlides } from "@/lib/slides";
import { popularItemIds } from "@/lib/popular";
import { activeBands, AUTO_HEADLINE, AUTO_LINES, safeSettings } from "@/lib/settings";
import { toBatchView } from "@/lib/view";

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
    />
  );
}
