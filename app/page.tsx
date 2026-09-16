import { cookies } from "next/headers";
import Storefront from "@/components/Storefront";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { activePromoter } from "@/lib/promoters";
import { getSettings } from "@/lib/settings";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; restaurant?: string }>;
}) {
  const params = await searchParams;
  // The proxy sets the ref cookie on this response, so it is not readable
  // until the next request, and the code has to come off the URL on the way in.
  const ref = params.ref ?? (await cookies()).get("sudu_ref")?.value;

  const [menu, batches, promoter, settings] = await Promise.all([
    menuView(),
    openBatches(),
    activePromoter(ref),
    getSettings(),
  ]);

  const nextRun = batches.length > 0 ? toBatchView(batches[0]) : null;

  return (
    <div className="space-y-5">
      <Storefront
        menu={menu}
        promoter={promoter}
        nextRun={nextRun}
        initialRestaurantId={params.restaurant}
      />
      <p className="pb-4 text-center text-sm text-ink/55">{settings.pitch_line}</p>
    </div>
  );
}
