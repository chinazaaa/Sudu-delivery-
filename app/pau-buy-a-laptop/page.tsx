import ErrandPage, { errandMeta } from "@/components/ErrandPage";

export const dynamic = "force-dynamic";

export const metadata = errandMeta("pau-buy-a-laptop");

export default function Page() {
  return <ErrandPage slug="pau-buy-a-laptop" />;
}
