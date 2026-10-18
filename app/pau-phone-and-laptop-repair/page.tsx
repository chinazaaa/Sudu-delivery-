import ErrandPage, { errandMeta } from "@/components/ErrandPage";

export const dynamic = "force-dynamic";

export const metadata = errandMeta("pau-phone-and-laptop-repair");

export default function Page() {
  return <ErrandPage slug="pau-phone-and-laptop-repair" />;
}
