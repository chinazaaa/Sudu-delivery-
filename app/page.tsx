import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { listSlides } from "@/lib/slides";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [menu, batches, slides] = await Promise.all([
    menuView(),
    openBatches(),
    listSlides(),
  ]);

  return (
    <Home
      menu={menu}
      slides={slides}
      nextRun={batches.length > 0 ? toBatchView(batches[0]) : null}
    />
  );
}
