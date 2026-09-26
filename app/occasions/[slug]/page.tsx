import type { Metadata } from "next";

import BoxDetail from "@/components/BoxDetail";
import { occasionBySlug } from "@/lib/boxes";

export const dynamic = "force-dynamic";

/**
 * A title, a description and a canonical of its own.
 *
 * Every one of these was sharing the shop's, so a link to any of them read
 * as the home page: the same card, the same words, on eight different
 * things. The picture beside it is drawn per collection in
 * opengraph-image.tsx.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;
  const shelf = await occasionBySlug(slug).catch(() => null);
  if (!shelf) return {};

  const said =
    shelf.blurb ||
    "Packed here, one price with delivery in it, to your block at PAU.";

  return {
    title: shelf.name,
    description: said,
    alternates: { canonical: `/occasions/${shelf.slug}` },
    openGraph: { title: shelf.name, description: said, url: `/occasions/${shelf.slug}` },
  };
}

export default async function OccasionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <BoxDetail
      slug={(await params).slug}
      kind="occasion"
      base="/occasions"
      elsewhere="/collections"
      back="Everything else on"
    />
  );
}
