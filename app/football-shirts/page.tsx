import type { Metadata } from "next";

import UkPage from "@/components/UkPage";

export const dynamic = "force-dynamic";

const TITLE = "Football shirts from the UK";
const BLURB =
  "Any club or country. Tell us the shirt and the size, and we send the price on WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/football-shirts" },
  openGraph: { title: TITLE, description: BLURB, url: "/football-shirts" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const asks = await searchParams;
  return <UkPage kind="shirt" sent={asks.sent === "1"} />;
}
