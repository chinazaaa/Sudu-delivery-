import type { Metadata } from "next";

import UkPage from "@/components/UkPage";

export const dynamic = "force-dynamic";

const TITLE = "Anything from the UK";
const BLURB =
  "Tell us what you want from the UK, and we send the price on WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/from-the-uk" },
  openGraph: { title: TITLE, description: BLURB, url: "/from-the-uk" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const asks = await searchParams;
  return <UkPage kind="other" sent={asks.sent === "1"} />;
}
