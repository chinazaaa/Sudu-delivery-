import { cookies } from "next/headers";
import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { activePromoter } from "@/lib/promoters";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  // The proxy sets the ref cookie on this response, so it is not readable
  // until the next request, and the code has to come off the URL on the way in.
  const ref = params.ref ?? (await cookies()).get("sudu_ref")?.value;

  const [menu, batches, promoter] = await Promise.all([
    menuView(),
    openBatches(),
    activePromoter(ref),
  ]);

  return (
    <Home
      menu={menu}
      promoter={promoter}
      nextRun={batches.length > 0 ? toBatchView(batches[0]) : null}
    />
  );
}
