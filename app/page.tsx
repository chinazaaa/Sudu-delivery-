import { cookies } from "next/headers";
import Home from "@/components/Home";
import { openBatches } from "@/lib/batches";
import { menuView } from "@/lib/menu";
import { toBatchView } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, never>>;
}) {
  const params = await searchParams;

  const [menu, batches] = await Promise.all([
    menuView(),
    openBatches(),
  ]);

  return (
    <Home
      menu={menu}
      nextRun={batches.length > 0 ? toBatchView(batches[0]) : null}
    />
  );
}
