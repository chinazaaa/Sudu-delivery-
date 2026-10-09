import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Every box that used to live under /occasions now lives under /collections. */
export default async function OccasionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  permanentRedirect(`/collections/${(await params).slug}`);
}
