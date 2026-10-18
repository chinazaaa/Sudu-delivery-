import ErrandPage, { errandMeta } from "@/components/ErrandPage";

export const dynamic = "force-dynamic";

export const metadata = errandMeta("pau-hair-and-barbing");

export default function Page() {
  return <ErrandPage slug="pau-hair-and-barbing" />;
}
