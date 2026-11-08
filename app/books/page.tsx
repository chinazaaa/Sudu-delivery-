import type { Metadata } from "next";

import UkPage from "@/components/UkPage";

export const dynamic = "force-dynamic";

const TITLE = "Books from the UK";
const BLURB =
  "Any book. Tell us the title, and we send the price on WhatsApp.";

export const metadata: Metadata = {
  title: TITLE,
  description: BLURB,
  alternates: { canonical: "/books" },
  openGraph: { title: TITLE, description: BLURB, url: "/books" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const asks = await searchParams;
  return <UkPage kind="book" sent={asks.sent === "1"} />;
}
