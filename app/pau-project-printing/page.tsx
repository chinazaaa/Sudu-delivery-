import ErrandPage, { errandMeta } from "@/components/ErrandPage";

export const dynamic = "force-dynamic";

export const metadata = errandMeta("pau-project-printing");

export default function Page() {
  return <ErrandPage slug="pau-project-printing" />;
}
