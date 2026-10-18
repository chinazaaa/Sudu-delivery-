import ErrandPage, { errandMeta } from "@/components/ErrandPage";

export const dynamic = "force-dynamic";

export const metadata = errandMeta("pau-tailoring");

export default function Page() {
  return <ErrandPage slug="pau-tailoring" />;
}
